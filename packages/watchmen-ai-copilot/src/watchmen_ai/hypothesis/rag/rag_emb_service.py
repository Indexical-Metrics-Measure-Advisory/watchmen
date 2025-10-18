import os
import uuid
import re
from typing import List, Dict, Optional, Any, Tuple
from datetime import datetime
import asyncio
from pathlib import Path

import lancedb
import pyarrow as pa

import numpy as np
from pydantic import BaseModel
from logging import getLogger

from watchmen_ai.hypothesis.model.common import SimulationResult, ChallengeAnalysisResult
from watchmen_ai.hypothesis.model.analysis import BusinessChallengeWithProblems
from watchmen_ai.hypothesis.report.markdown_report import build_analysis_report_md
from watchmen_ai.hypothesis.rag.azure_openai_register import AzureOpenAIEmbeddings

logger = getLogger(__name__)


class ChallengeDocument(BaseModel):
    """Challenge document model for vector storage"""
    id: str
    simulation_id: str
    challenge_title: str
    challenge_description: str
    markdown_content: str
    content_type: str  # 'full_report', 'executive_summary', 'hypothesis_analysis', etc.
    chunk_index: int = 0
    total_chunks: int = 1
    created_at: datetime
    metadata: Dict[str, Any] = {}
    # 新增字段用于语义切片和检索优化
    semantic_section: Optional[str] = None  # 语义段落类型：hypothesis, conclusion, recommendation, etc.
    section_title: Optional[str] = None  # 段落标题
    token_count: Optional[int] = None  # token数量
    char_start: Optional[int] = None  # 在原文中的字符起始位置
    char_end: Optional[int] = None  # 在原文中的字符结束位置


class VectorSearchResult(BaseModel):
    """Vector search result model"""
    document: ChallengeDocument
    score: float
    distance: float


class RAGEmbeddingService:
    """RAG Embedding Service using LanceDB for vector storage"""

    def __init__(self,
                 db_path: str = "./data/lancedb",
                 table_name: str = "challenge_documents",
                 embedding_model: str = "text-embedding-ada-002",
                 chunk_size: int = 600,  # 优化为400-800 tokens范围的中值
                 chunk_overlap: int = 75,  # 优化为50-100 tokens范围的中值
                 azure_api_key: Optional[str] = None,
                 azure_endpoint: Optional[str] = None,
                 azure_deployment: Optional[str] = None,
                 azure_api_version: str = "2023-05-15"):
        """
        Initialize RAG Embedding Service

        Args:
            db_path: Path to LanceDB database
            table_name: Name of the table to store documents
            embedding_model: Embedding model name
            chunk_size: Size of text chunks for embedding
            chunk_overlap: Overlap between chunks
            azure_api_key: Azure OpenAI API key (if None, uses AZURE_OPENAI_API_KEY env var)
            azure_endpoint: Azure OpenAI endpoint (if None, uses AZURE_OPENAI_ENDPOINT env var)
            azure_deployment: Azure OpenAI deployment name (if None, uses AZURE_OPENAI_DEPLOYMENT env var)
            azure_api_version: Azure OpenAI API version
        """
        self.db_path = db_path
        self.table_name = table_name
        self.chunk_size = chunk_size
        self.chunk_overlap = chunk_overlap

        # Initialize embedding model
        self.embedding_model_name = embedding_model
        if embedding_model == "text-embedding-ada-002":
            self.embedding_dim = 1536  # OpenAI ada-002 dimension

            # Initialize Azure OpenAI embedding function
            self.azure_embedding_func = AzureOpenAIEmbeddings(
                name=embedding_model,
                azure_api_key="e115304f78534afa84ce909c0882bcd5",
                azure_endpoint="https://azure-insuremo-openai.openai.azure.com/",
                azure_deployment="text-embedding-ada-002",
                azure_api_version="2022-12-01"
            )

            # Validate required Azure OpenAI parameters
            if not all([self.azure_embedding_func.azure_api_key,
                        self.azure_embedding_func.azure_endpoint,
                        self.azure_embedding_func.azure_deployment]):
                raise ValueError(
                    "Azure OpenAI configuration incomplete. Please provide azure_api_key, "
                    "azure_endpoint, and azure_deployment parameters or set the following "
                    "environment variables: AZURE_OPENAI_API_KEY, AZURE_OPENAI_ENDPOINT, "
                    "AZURE_OPENAI_DEPLOYMENT"
                )

        # Initialize database
        self.db = None
        self.table = None
        self._initialize_db()

    def _initialize_db(self):
        """Initialize LanceDB database and table"""
        try:
            # Create database directory if it doesn't exist
            Path(self.db_path).mkdir(parents=True, exist_ok=True)

            # Connect to LanceDB
            self.db = lancedb.connect(self.db_path)

            # Define schema for the table
            schema = pa.schema([
                pa.field("id", pa.string()),
                pa.field("simulation_id", pa.string()),
                pa.field("challenge_title", pa.string()),
                pa.field("challenge_description", pa.string()),
                pa.field("markdown_content", pa.string()),
                pa.field("content_type", pa.string()),
                pa.field("chunk_index", pa.int32()),
                pa.field("total_chunks", pa.int32()),
                pa.field("created_at", pa.timestamp('us')),
                pa.field("metadata", pa.string()),  # JSON string
                pa.field("semantic_section", pa.string()),  # 语义段落类型
                pa.field("section_title", pa.string()),  # 段落标题
                pa.field("token_count", pa.int32()),  # token数量
                pa.field("char_start", pa.int32()),  # 字符起始位置
                pa.field("char_end", pa.int32()),  # 字符结束位置
                pa.field("vector", pa.list_(pa.float32(), self.embedding_dim))
            ])

            # Create table if it doesn't exist or migrate if schema is outdated
            if self.table_name not in self.db.table_names():
                # Create empty table with schema
                empty_data = pa.table({
                    "id": pa.array([], type=pa.string()),
                    "simulation_id": pa.array([], type=pa.string()),
                    "challenge_title": pa.array([], type=pa.string()),
                    "challenge_description": pa.array([], type=pa.string()),
                    "markdown_content": pa.array([], type=pa.string()),
                    "content_type": pa.array([], type=pa.string()),
                    "chunk_index": pa.array([], type=pa.int32()),
                    "total_chunks": pa.array([], type=pa.int32()),
                    "created_at": pa.array([], type=pa.timestamp('us')),
                    "metadata": pa.array([], type=pa.string()),
                    "semantic_section": pa.array([], type=pa.string()),
                    "section_title": pa.array([], type=pa.string()),
                    "token_count": pa.array([], type=pa.int32()),
                    "char_start": pa.array([], type=pa.int32()),
                    "char_end": pa.array([], type=pa.int32()),
                    "vector": pa.array([], type=pa.list_(pa.float32(), self.embedding_dim))
                })
                self.table = self.db.create_table(self.table_name, empty_data)
                logger.info(f"Created new table '{self.table_name}' with enhanced schema")
            else:
                # Check if existing table has the new fields
                existing_table = self.db.open_table(self.table_name)
                existing_schema = existing_table.schema

                # Check for new fields
                required_fields = ['semantic_section', 'section_title', 'token_count', 'char_start', 'char_end']
                missing_fields = [field for field in required_fields if field not in existing_schema.names]

                if missing_fields:
                    logger.warning(f"Table '{self.table_name}' is missing fields: {missing_fields}")
                    logger.info(f"Recreating table '{self.table_name}' with enhanced schema...")

                    # Backup existing data if any
                    try:
                        existing_data = existing_table.to_pandas()
                        if len(existing_data) > 0:
                            logger.info(f"Backing up {len(existing_data)} existing records...")
                            # Drop the old table
                            self.db.drop_table(self.table_name)

                            # Create new table with enhanced schema
                            empty_data = pa.table({
                                "id": pa.array([], type=pa.string()),
                                "simulation_id": pa.array([], type=pa.string()),
                                "challenge_title": pa.array([], type=pa.string()),
                                "challenge_description": pa.array([], type=pa.string()),
                                "markdown_content": pa.array([], type=pa.string()),
                                "content_type": pa.array([], type=pa.string()),
                                "chunk_index": pa.array([], type=pa.int32()),
                                "total_chunks": pa.array([], type=pa.int32()),
                                "created_at": pa.array([], type=pa.timestamp('us')),
                                "metadata": pa.array([], type=pa.string()),
                                "semantic_section": pa.array([], type=pa.string()),
                                "section_title": pa.array([], type=pa.string()),
                                "token_count": pa.array([], type=pa.int32()),
                                "char_start": pa.array([], type=pa.int32()),
                                "char_end": pa.array([], type=pa.int32()),
                                "vector": pa.array([], type=pa.list_(pa.float32(), self.embedding_dim))
                            })
                            self.table = self.db.create_table(self.table_name, empty_data)

                            # Migrate existing data with default values for new fields
                            migrated_data = []
                            for _, row in existing_data.iterrows():
                                migrated_row = {
                                    "id": row['id'],
                                    "simulation_id": row['simulation_id'],
                                    "challenge_title": row['challenge_title'],
                                    "challenge_description": row['challenge_description'],
                                    "markdown_content": row['markdown_content'],
                                    "content_type": row['content_type'],
                                    "chunk_index": row['chunk_index'],
                                    "total_chunks": row['total_chunks'],
                                    "created_at": row['created_at'],
                                    "metadata": row['metadata'],
                                    "semantic_section": "general",  # Default value
                                    "section_title": "",  # Default value
                                    "token_count": self._estimate_tokens(row['markdown_content']),  # Calculate
                                    "char_start": 0,  # Default value
                                    "char_end": len(row['markdown_content']),  # Calculate
                                    "vector": row['vector']
                                }
                                migrated_data.append(migrated_row)

                            # Insert migrated data
                            if migrated_data:
                                self.table.add(migrated_data)
                                logger.info(f"Successfully migrated {len(migrated_data)} records to new schema")
                        else:
                            # No existing data, just recreate the table
                            self.db.drop_table(self.table_name)
                            empty_data = pa.table({
                                "id": pa.array([], type=pa.string()),
                                "simulation_id": pa.array([], type=pa.string()),
                                "challenge_title": pa.array([], type=pa.string()),
                                "challenge_description": pa.array([], type=pa.string()),
                                "markdown_content": pa.array([], type=pa.string()),
                                "content_type": pa.array([], type=pa.string()),
                                "chunk_index": pa.array([], type=pa.int32()),
                                "total_chunks": pa.array([], type=pa.int32()),
                                "created_at": pa.array([], type=pa.timestamp('us')),
                                "metadata": pa.array([], type=pa.string()),
                                "semantic_section": pa.array([], type=pa.string()),
                                "section_title": pa.array([], type=pa.string()),
                                "token_count": pa.array([], type=pa.int32()),
                                "char_start": pa.array([], type=pa.int32()),
                                "char_end": pa.array([], type=pa.int32()),
                                "vector": pa.array([], type=pa.list_(pa.float32(), self.embedding_dim))
                            })
                            self.table = self.db.create_table(self.table_name, empty_data)
                            logger.info(f"Recreated empty table '{self.table_name}' with enhanced schema")

                    except Exception as migration_error:
                        logger.error(f"Failed to migrate table: {str(migration_error)}")
                        # Fallback: just drop and recreate empty table
                        self.db.drop_table(self.table_name)
                        empty_data = pa.table({
                            "id": pa.array([], type=pa.string()),
                            "simulation_id": pa.array([], type=pa.string()),
                            "challenge_title": pa.array([], type=pa.string()),
                            "challenge_description": pa.array([], type=pa.string()),
                            "markdown_content": pa.array([], type=pa.string()),
                            "content_type": pa.array([], type=pa.string()),
                            "chunk_index": pa.array([], type=pa.int32()),
                            "total_chunks": pa.array([], type=pa.int32()),
                            "created_at": pa.array([], type=pa.timestamp('us')),
                            "metadata": pa.array([], type=pa.string()),
                            "semantic_section": pa.array([], type=pa.string()),
                            "section_title": pa.array([], type=pa.string()),
                            "token_count": pa.array([], type=pa.int32()),
                            "char_start": pa.array([], type=pa.int32()),
                            "char_end": pa.array([], type=pa.int32()),
                            "vector": pa.array([], type=pa.list_(pa.float32(), self.embedding_dim))
                        })
                        self.table = self.db.create_table(self.table_name, empty_data)
                        logger.warning(f"Fallback: Created new empty table '{self.table_name}'")
                else:
                    # Schema is up to date
                    self.table = existing_table
                    logger.info(f"Using existing table '{self.table_name}' with current schema")

            logger.info(f"LanceDB initialized successfully at {self.db_path}")

        except Exception as e:
            logger.error(f"Failed to initialize LanceDB: {str(e)}")
            raise

    def _estimate_tokens(self, text: str) -> int:
        """估算文本的token数量（粗略估算：1 token ≈ 4 characters）"""
        return len(text) // 4

    def _identify_semantic_sections(self, text: str) -> List[Tuple[str, int, int, str]]:
        """识别语义段落：假设、结论、推荐动作等

        Returns:
            List of (section_type, start_pos, end_pos, title)
        """
        sections = []
        lines = text.split('\n')
        current_pos = 0
        current_section = None
        section_start = 0
        section_title = ""

        # 定义语义段落标识符
        section_patterns = {
            'hypothesis': [r'##\s*假设', r'##\s*Hypothesis', r'##\s*假设分析', r'##\s*问题假设'],
            'conclusion': [r'##\s*结论', r'##\s*Conclusion', r'##\s*总结', r'##\s*Summary'],
            'recommendation': [r'##\s*建议', r'##\s*Recommendation', r'##\s*推荐', r'##\s*行动建议'],
            'analysis': [r'##\s*分析', r'##\s*Analysis', r'##\s*数据分析', r'##\s*结果分析'],
            'executive_summary': [r'##\s*执行摘要', r'##\s*Executive Summary', r'##\s*概要'],
            'future_action': [r'##\s*未来行动', r'##\s*Future Action', r'##\s*后续步骤']
        }

        for i, line in enumerate(lines):
            line_start = current_pos
            current_pos += len(line) + 1  # +1 for newline

            # 检查是否是新的语义段落开始
            new_section = None
            new_title = ""
            for section_type, patterns in section_patterns.items():
                for pattern in patterns:
                    if re.match(pattern, line.strip(), re.IGNORECASE):
                        new_section = section_type
                        new_title = line.strip()
                        break
                if new_section:
                    break

            # 如果找到新段落，保存之前的段落
            if new_section and current_section:
                sections.append((current_section, section_start, line_start, section_title))

            # 开始新段落
            if new_section:
                current_section = new_section
                section_start = line_start
                section_title = new_title

        # 添加最后一个段落
        if current_section:
            sections.append((current_section, section_start, len(text), section_title))

        # 如果没有识别到语义段落，将整个文本作为一个通用段落
        if not sections:
            sections.append(('general', 0, len(text), ''))

        return sections

    def _chunk_text_semantic(self, text: str) -> List[Dict[str, Any]]:
        """基于语义段落进行智能切片

        Returns:
            List of chunk dictionaries with metadata
        """
        if self._estimate_tokens(text) <= 800:  # 如果整个文本小于800 tokens，直接返回
            return [{
                'content': text,
                'semantic_section': 'complete',
                'section_title': '',
                'token_count': self._estimate_tokens(text),
                'char_start': 0,
                'char_end': len(text)
            }]

        # 识别语义段落
        sections = self._identify_semantic_sections(text)
        chunks = []

        for section_type, start_pos, end_pos, title in sections:
            section_text = text[start_pos:end_pos].strip()
            section_tokens = self._estimate_tokens(section_text)

            if section_tokens <= 800:  # 段落小于800 tokens，保持完整
                chunks.append({
                    'content': section_text,
                    'semantic_section': section_type,
                    'section_title': title,
                    'token_count': section_tokens,
                    'char_start': start_pos,
                    'char_end': end_pos
                })
            else:  # 段落过大，需要进一步切分
                sub_chunks = self._split_large_section(section_text, section_type, title, start_pos)
                chunks.extend(sub_chunks)

        # 添加重叠内容以保持上下文连贯性
        return self._add_overlap_to_chunks(chunks, text)

    def _split_large_section(self, section_text: str, section_type: str, title: str, base_start: int) -> List[
        Dict[str, Any]]:
        """切分过大的语义段落"""
        chunks = []
        target_size = 600  # 目标大小（tokens）
        overlap_size = 75  # 重叠大小（tokens）

        # 按段落分割
        paragraphs = section_text.split('\n\n')
        current_chunk = ""
        current_start = base_start

        for paragraph in paragraphs:
            paragraph = paragraph.strip()
            if not paragraph:
                continue

            test_chunk = current_chunk + ("\n\n" if current_chunk else "") + paragraph
            test_tokens = self._estimate_tokens(test_chunk)

            if test_tokens <= target_size:
                current_chunk = test_chunk
            else:
                # 保存当前chunk
                if current_chunk:
                    chunks.append({
                        'content': current_chunk,
                        'semantic_section': section_type,
                        'section_title': title,
                        'token_count': self._estimate_tokens(current_chunk),
                        'char_start': current_start,
                        'char_end': current_start + len(current_chunk)
                    })
                    current_start += len(current_chunk)

                # 开始新chunk
                current_chunk = paragraph

        # 添加最后一个chunk
        if current_chunk:
            chunks.append({
                'content': current_chunk,
                'semantic_section': section_type,
                'section_title': title,
                'token_count': self._estimate_tokens(current_chunk),
                'char_start': current_start,
                'char_end': current_start + len(current_chunk)
            })

        return chunks

    def _add_overlap_to_chunks(self, chunks: List[Dict[str, Any]], full_text: str) -> List[Dict[str, Any]]:
        """为切片添加重叠内容以保持上下文连贯性"""
        if len(chunks) <= 1:
            return chunks

        overlap_chars = self.chunk_overlap * 4  # 粗略转换为字符数
        enhanced_chunks = []

        for i, chunk in enumerate(chunks):
            content = chunk['content']

            # 添加前向重叠（从前一个chunk）
            if i > 0:
                prev_chunk = chunks[i - 1]
                prev_content = prev_chunk['content']
                if len(prev_content) > overlap_chars:
                    overlap_text = prev_content[-overlap_chars:]
                    # 找到合适的断句点
                    for j in range(len(overlap_text)):
                        if overlap_text[j] in '.!?\n':
                            overlap_text = overlap_text[j + 1:]
                            break
                    content = overlap_text.strip() + "\n\n" + content

            # 添加后向重叠（从后一个chunk）
            if i < len(chunks) - 1:
                next_chunk = chunks[i + 1]
                next_content = next_chunk['content']
                if len(next_content) > overlap_chars:
                    overlap_text = next_content[:overlap_chars]
                    # 找到合适的断句点
                    for j in range(len(overlap_text) - 1, -1, -1):
                        if overlap_text[j] in '.!?\n':
                            overlap_text = overlap_text[:j + 1]
                            break
                    content = content + "\n\n" + overlap_text.strip()

            enhanced_chunk = chunk.copy()
            enhanced_chunk['content'] = content
            enhanced_chunk['token_count'] = self._estimate_tokens(content)
            enhanced_chunks.append(enhanced_chunk)

        return enhanced_chunks

    def _chunk_text(self, text: str) -> List[str]:
        """Split text into chunks for embedding (保持向后兼容性)"""
        chunks_with_metadata = self._chunk_text_semantic(text)
        return [chunk['content'] for chunk in chunks_with_metadata]

    def _generate_embedding(self, text: str) -> List[float]:
        """Generate embedding for text"""
        try:
            if self.embedding_model_name == "text-embedding-ada-002":
                # Use Azure OpenAI API
                embeddings = self.azure_embedding_func.generate_embeddings([text])
                return embeddings[0].tolist() if isinstance(embeddings[0], np.ndarray) else embeddings[0]
            else:
                # Use sentence-transformers (fallback)
                embedding = self.embedding_model.encode(text, convert_to_numpy=True)
                return embedding.tolist()
        except Exception as e:
            logger.error(f"Failed to generate embedding: {str(e)}")
            raise

    async def store_simulation_result(self, simulation_result: SimulationResult) -> List[str]:
        """Store simulation result challenge markdown content in vector database"""
        try:
            # Generate markdown content from simulation result
            # markdown_content = build_analysis_report_md(simulation_result)
            # check simulation_result is dict
            if isinstance(simulation_result, dict):
                print(simulation_result)
                markdown_content = simulation_result["result"]["challengeMarkdown"]
            else:
                markdown_content = simulation_result.result.challengeMarkdown

            # Extract basic information
            challenge = BusinessChallengeWithProblems.model_validate(simulation_result["challenge"])
            result = ChallengeAnalysisResult.model_validate(simulation_result["result"])

            simulation_id = simulation_result["simulationId"] or str(uuid.uuid4())

            # Prepare documents to store
            documents_to_store = []
            document_ids = []

            # 1. Store full markdown report with semantic chunking
            full_report_chunks_with_metadata = self._chunk_text_semantic(markdown_content)
            for i, chunk_data in enumerate(full_report_chunks_with_metadata):
                doc_id = f"{simulation_id}_full_report_{i}"
                document = ChallengeDocument(
                    id=doc_id,
                    simulation_id=simulation_id,
                    challenge_title=challenge.title,
                    challenge_description=challenge.description,
                    markdown_content=chunk_data['content'],
                    content_type="full_report",
                    chunk_index=i,
                    total_chunks=len(full_report_chunks_with_metadata),
                    created_at=datetime.now(),
                    semantic_section=chunk_data.get('semantic_section'),
                    section_title=chunk_data.get('section_title'),
                    token_count=chunk_data.get('token_count'),
                    char_start=chunk_data.get('char_start'),
                    char_end=chunk_data.get('char_end'),
                    metadata={
                        "environment_status": simulation_result["environmentStatus"],
                        "total_problems": len(challenge.problems) if challenge.problems else 0,
                        "has_insight_result": bool(result.challengeInsightResult),
                        "semantic_section": chunk_data.get('semantic_section'),
                        "section_title": chunk_data.get('section_title'),
                        "token_count": chunk_data.get('token_count')
                    }
                )
                documents_to_store.append(document)
                document_ids.append(doc_id)

            # 2. Store executive summary if available
            if result.challengeInsightResult and result.challengeInsightResult.answerForConclusion:
                summary_text = f"Challenge: {challenge.title}\n\nConclusion: {result.challengeInsightResult.answerForConclusion}"
                if result.challengeInsightResult.summaryForQuestions:
                    summary_text += f"\n\nSummary: {result.challengeInsightResult.summaryForQuestions}"

                doc_id = f"{simulation_id}_executive_summary"
                document = ChallengeDocument(
                    id=doc_id,
                    simulation_id=simulation_id,
                    challenge_title=challenge.title,
                    challenge_description=challenge.description,
                    markdown_content=summary_text,
                    content_type="executive_summary",
                    chunk_index=0,
                    total_chunks=1,
                    created_at=datetime.now(),
                    semantic_section="executive_summary",
                    section_title="Executive Summary",
                    token_count=self._estimate_tokens(summary_text),
                    char_start=0,
                    char_end=len(summary_text),
                    metadata={
                        "has_future_analysis": bool(result.challengeInsightResult.futureAnalysis),
                        "has_business_action": bool(result.challengeInsightResult.futureBusinessAction),
                        "semantic_section": "executive_summary",
                        "section_title": "Executive Summary",
                        "token_count": self._estimate_tokens(summary_text)
                    }
                )
                documents_to_store.append(document)
                document_ids.append(doc_id)

            # 3. Store hypothesis analysis markdown if available
            if result.hypothesisAnalysisMarkdownDict:
                for problem_id, hypothesis_markdown in result.hypothesisAnalysisMarkdownDict.items():
                    hypothesis_chunks_with_metadata = self._chunk_text_semantic(hypothesis_markdown)
                    for i, chunk_data in enumerate(hypothesis_chunks_with_metadata):
                        doc_id = f"{simulation_id}_hypothesis_{problem_id}_{i}"
                        document = ChallengeDocument(
                            id=doc_id,
                            simulation_id=simulation_id,
                            challenge_title=challenge.title,
                            challenge_description=challenge.description,
                            markdown_content=chunk_data['content'],
                            content_type="hypothesis_analysis",
                            chunk_index=i,
                            total_chunks=len(hypothesis_chunks_with_metadata),
                            created_at=datetime.now(),
                            semantic_section=chunk_data.get('semantic_section', 'hypothesis'),
                            section_title=chunk_data.get('section_title'),
                            token_count=chunk_data.get('token_count'),
                            char_start=chunk_data.get('char_start'),
                            char_end=chunk_data.get('char_end'),
                            metadata={
                                "problem_id": problem_id,
                                "analysis_type": "hypothesis",
                                "semantic_section": chunk_data.get('semantic_section', 'hypothesis'),
                                "section_title": chunk_data.get('section_title'),
                                "token_count": chunk_data.get('token_count')
                            }
                        )
                        documents_to_store.append(document)
                        document_ids.append(doc_id)

            # 4. Store question answer markdown if available
            if result.questionAnswerMarkdown:
                qa_chunks_with_metadata = self._chunk_text_semantic(result.questionAnswerMarkdown)
                for i, chunk_data in enumerate(qa_chunks_with_metadata):
                    doc_id = f"{simulation_id}_qa_{i}"
                    document = ChallengeDocument(
                        id=doc_id,
                        simulation_id=simulation_id,
                        challenge_title=challenge.title,
                        challenge_description=challenge.description,
                        markdown_content=chunk_data['content'],
                        content_type="question_answer",
                        chunk_index=i,
                        total_chunks=len(qa_chunks_with_metadata),
                        created_at=datetime.now(),
                        semantic_section=chunk_data.get('semantic_section', 'question_answer'),
                        section_title=chunk_data.get('section_title'),
                        token_count=chunk_data.get('token_count'),
                        char_start=chunk_data.get('char_start'),
                        char_end=chunk_data.get('char_end'),
                        metadata={
                            "analysis_type": "question_answer",
                            "semantic_section": chunk_data.get('semantic_section', 'question_answer'),
                            "section_title": chunk_data.get('section_title'),
                            "token_count": chunk_data.get('token_count')
                        }
                    )
                    documents_to_store.append(document)
                    document_ids.append(doc_id)

            # Generate embeddings and store documents
            await self._store_documents(documents_to_store)

            logger.info(f"Successfully stored {len(documents_to_store)} documents for simulation {simulation_id}")
            return document_ids

        except Exception as e:
            logger.error(f"Failed to store simulation result: {str(e)}")
            raise

    async def _store_documents(self, documents: List[ChallengeDocument]):
        """Store documents in LanceDB with embeddings"""
        if not documents:
            return

        # Prepare data for insertion
        data = {
            "id": [],
            "simulation_id": [],
            "challenge_title": [],
            "challenge_description": [],
            "markdown_content": [],
            "content_type": [],
            "chunk_index": [],
            "total_chunks": [],
            "created_at": [],
            "metadata": [],
            "semantic_section": [],
            "section_title": [],
            "token_count": [],
            "char_start": [],
            "char_end": [],
            "vector": []
        }

        for doc in documents:
            # Generate embedding
            embedding = self._generate_embedding(doc.markdown_content)

            # Add to data
            data["id"].append(doc.id)
            data["simulation_id"].append(doc.simulation_id)
            data["challenge_title"].append(doc.challenge_title)
            data["challenge_description"].append(doc.challenge_description)
            data["markdown_content"].append(doc.markdown_content)
            data["content_type"].append(doc.content_type)
            data["chunk_index"].append(doc.chunk_index)
            data["total_chunks"].append(doc.total_chunks)
            data["created_at"].append(doc.created_at)
            data["metadata"].append(str(doc.metadata))  # Convert to JSON string
            data["semantic_section"].append(doc.semantic_section or "")
            data["section_title"].append(doc.section_title or "")
            data["token_count"].append(doc.token_count or 0)
            data["char_start"].append(doc.char_start or 0)
            data["char_end"].append(doc.char_end or 0)
            data["vector"].append(embedding)

        # Convert to PyArrow table
        table_data = pa.table(data)

        # Add to LanceDB table
        self.table.add(table_data)

        logger.info(f"Added {len(documents)} documents to LanceDB")

    async def search_similar_challenges(self,
                                        query: str,
                                        limit: int = 5,
                                        content_types: Optional[List[str]] = None,
                                        simulation_ids: Optional[List[str]] = None) -> List[VectorSearchResult]:
        """Search for similar challenges using vector similarity"""
        try:
            # Generate query embedding
            query_embedding = self._generate_embedding(query)

            # Build search query
            search_query = self.table.search(query_embedding).limit(limit)

            # Add filters if specified
            if content_types:
                content_filter = " OR ".join([f"content_type = '{ct}'" for ct in content_types])
                search_query = search_query.where(content_filter)

            if simulation_ids:
                sim_filter = " OR ".join([f"simulation_id = '{sid}'" for sid in simulation_ids])
                search_query = search_query.where(sim_filter)

            # Execute search
            results = search_query.to_pandas()

            # Convert results to VectorSearchResult objects
            search_results = []
            for _, row in results.iterrows():
                document = ChallengeDocument(
                    id=row['id'],
                    simulation_id=row['simulation_id'],
                    challenge_title=row['challenge_title'],
                    challenge_description=row['challenge_description'],
                    markdown_content=row['markdown_content'],
                    content_type=row['content_type'],
                    chunk_index=row['chunk_index'],
                    total_chunks=row['total_chunks'],
                    created_at=row['created_at'],
                    semantic_section=row.get('semantic_section'),
                    section_title=row.get('section_title'),
                    token_count=row.get('token_count'),
                    char_start=row.get('char_start'),
                    char_end=row.get('char_end'),
                    metadata=eval(row['metadata']) if row['metadata'] else {}
                )

                search_result = VectorSearchResult(
                    document=document,
                    score=row.get('_score', 0.0),
                    distance=row.get('_distance', 0.0)
                )
                search_results.append(search_result)

            logger.info(f"Found {len(search_results)} similar challenges for query: {query[:50]}...")
            return search_results

        except Exception as e:
            logger.error(f"Failed to search similar challenges: {str(e)}")
            raise

    async def search_by_semantic_section(self,
                                         query: str,
                                         semantic_sections: Optional[List[str]] = None,
                                         limit: int = 5,
                                         content_types: Optional[List[str]] = None,
                                         min_token_count: Optional[int] = None,
                                         max_token_count: Optional[int] = None) -> List[VectorSearchResult]:
        """基于语义段落类型的高级搜索

        Args:
            query: 搜索查询
            semantic_sections: 语义段落类型列表 ['hypothesis', 'conclusion', 'recommendation', etc.]
            limit: 返回结果数量限制
            content_types: 内容类型过滤
            min_token_count: 最小token数量
            max_token_count: 最大token数量

        Returns:
            搜索结果列表
        """
        try:
            # Generate query embedding
            query_embedding = self._generate_embedding(query)

            # Build search query
            search_query = self.table.search(query_embedding).limit(limit)

            # Build filters
            filters = []

            # 语义段落类型过滤
            if semantic_sections:
                section_filter = " OR ".join([f"semantic_section = '{section}'" for section in semantic_sections])
                filters.append(f"({section_filter})")

            # 内容类型过滤
            if content_types:
                content_filter = " OR ".join([f"content_type = '{ct}'" for ct in content_types])
                filters.append(f"({content_filter})")

            # Token数量过滤
            if min_token_count is not None:
                filters.append(f"token_count >= {min_token_count}")

            if max_token_count is not None:
                filters.append(f"token_count <= {max_token_count}")

            # 应用过滤条件
            if filters:
                combined_filter = " AND ".join(filters)
                search_query = search_query.where(combined_filter)

            # Execute search
            results = search_query.to_pandas()

            # Convert results to VectorSearchResult objects
            search_results = []
            for _, row in results.iterrows():
                document = ChallengeDocument(
                    id=row['id'],
                    simulation_id=row['simulation_id'],
                    challenge_title=row['challenge_title'],
                    challenge_description=row['challenge_description'],
                    markdown_content=row['markdown_content'],
                    content_type=row['content_type'],
                    chunk_index=row['chunk_index'],
                    total_chunks=row['total_chunks'],
                    created_at=row['created_at'],
                    semantic_section=row.get('semantic_section'),
                    section_title=row.get('section_title'),
                    token_count=row.get('token_count'),
                    char_start=row.get('char_start'),
                    char_end=row.get('char_end'),
                    metadata=eval(row['metadata']) if row['metadata'] else {}
                )

                search_result = VectorSearchResult(
                    document=document,
                    score=row.get('_score', 0.0),
                    distance=row.get('_distance', 0.0)
                )
                search_results.append(search_result)

            logger.info(f"Found {len(search_results)} results for semantic search: {query[:50]}...")
            return search_results

        except Exception as e:
            logger.error(f"Failed to search by semantic section: {str(e)}")
            raise

    async def get_challenge_by_simulation_id(self, simulation_id: str) -> List[ChallengeDocument]:
        """Get all challenge documents by simulation ID"""
        try:
            # Query by simulation_id
            results = self.table.search().where(f"simulation_id = '{simulation_id}'").to_pandas()

            documents = []
            for _, row in results.iterrows():
                document = ChallengeDocument(
                    id=row['id'],
                    simulation_id=row['simulation_id'],
                    challenge_title=row['challenge_title'],
                    challenge_description=row['challenge_description'],
                    markdown_content=row['markdown_content'],
                    content_type=row['content_type'],
                    chunk_index=row['chunk_index'],
                    total_chunks=row['total_chunks'],
                    created_at=row['created_at'],
                    semantic_section=row.get('semantic_section'),
                    section_title=row.get('section_title'),
                    token_count=row.get('token_count'),
                    char_start=row.get('char_start'),
                    char_end=row.get('char_end'),
                    metadata=eval(row['metadata']) if row['metadata'] else {}
                )
                documents.append(document)

            return documents

        except Exception as e:
            logger.error(f"Failed to get challenge by simulation ID: {str(e)}")
            raise

    async def delete_simulation_documents(self, simulation_id: str) -> int:
        """Delete all documents for a simulation"""
        try:
            # Get count before deletion
            before_count = len(self.table.search().where(f"simulation_id = '{simulation_id}'").to_pandas())

            # Delete documents
            self.table.delete(f"simulation_id = '{simulation_id}'")

            logger.info(f"Deleted {before_count} documents for simulation {simulation_id}")
            return before_count

        except Exception as e:
            logger.error(f"Failed to delete simulation documents: {str(e)}")
            raise

    async def get_database_stats(self) -> Dict[str, Any]:
        """Get database statistics"""
        try:
            df = self.table.to_pandas()

            # Get total count
            total_docs = len(df)

            # Get unique simulations
            unique_sims = df['simulation_id'].nunique()

            # Get content type distribution
            content_types = df['content_type'].value_counts().to_dict()

            # Get semantic section distribution
            semantic_sections = df[
                'semantic_section'].value_counts().to_dict() if 'semantic_section' in df.columns else {}

            # Get token count statistics
            token_stats = {}
            if 'token_count' in df.columns and not df['token_count'].isna().all():
                token_stats = {
                    "mean": float(df['token_count'].mean()),
                    "median": float(df['token_count'].median()),
                    "min": int(df['token_count'].min()),
                    "max": int(df['token_count'].max()),
                    "std": float(df['token_count'].std())
                }

            # Get chunk size distribution
            chunk_size_distribution = {}
            if 'token_count' in df.columns:
                # 按照优化建议的范围分组
                df['token_range'] = df['token_count'].apply(lambda x:
                                                            '0-400' if x < 400 else
                                                            '400-600' if x < 600 else
                                                            '600-800' if x < 800 else
                                                            '800+'
                                                            )
                chunk_size_distribution = df['token_range'].value_counts().to_dict()

            stats = {
                "total_documents": total_docs,
                "unique_simulations": unique_sims,
                "content_type_distribution": content_types,
                "semantic_section_distribution": semantic_sections,
                "token_count_statistics": token_stats,
                "chunk_size_distribution": chunk_size_distribution,
                "database_path": self.db_path,
                "table_name": self.table_name,
                "embedding_model": self.embedding_model_name,
                "embedding_dimension": self.embedding_dim,
                "optimization_compliance": {
                    "optimal_chunk_size_ratio": len(df[(df['token_count'] >= 400) & (
                                df['token_count'] <= 800)]) / total_docs if total_docs > 0 else 0,
                    "semantic_sections_identified": len(df[df['semantic_section'].notna() & (
                                df['semantic_section'] != '')]) / total_docs if total_docs > 0 else 0
                }
            }

            return stats

        except Exception as e:
            logger.error(f"Failed to get database stats: {str(e)}")
            raise


# Global service instance
_rag_service: Optional[RAGEmbeddingService] = None


def get_rag_embedding_service() -> RAGEmbeddingService:
    """Get global RAG embedding service instance"""
    global _rag_service
    if _rag_service is None:
        _rag_service = RAGEmbeddingService()
    return _rag_service


async def store_challenge_content(simulation_result: SimulationResult) -> List[str]:
    """Convenience function to store challenge content"""
    service = get_rag_embedding_service()
    return await service.store_simulation_result(simulation_result)


async def search_similar_content(query: str, limit: int = 10) -> List[VectorSearchResult]:
    """Convenience function to search similar content"""
    service = get_rag_embedding_service()
    return await service.search_similar_challenges(query, limit)


async def search_semantic_content(query: str,
                                  semantic_sections: Optional[List[str]] = None,
                                  limit: int = 10) -> List[VectorSearchResult]:
    """Convenience function to search content by semantic sections

    Args:
        query: 搜索查询
        semantic_sections: 语义段落类型 ['hypothesis', 'conclusion', 'recommendation', 'analysis', 'executive_summary', 'future_action']
        limit: 返回结果数量限制
    """
    service = get_rag_embedding_service()
    return await service.search_by_semantic_section(query, semantic_sections, limit)