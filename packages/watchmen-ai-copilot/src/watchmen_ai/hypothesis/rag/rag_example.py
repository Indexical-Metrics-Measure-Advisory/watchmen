#!/usr/bin/env python3
"""
RAG Embedding Service Example

This example demonstrates how to use the RAG embedding service to:
1. Store simulation result challenge markdown content in LanceDB
2. Search for similar challenges using vector similarity
3. Retrieve challenge documents by simulation ID
4. Get database statistics

Prerequisites:
- Set OPENAI_API_KEY environment variable for OpenAI embedding models
- Example: export OPENAI_API_KEY="your-openai-api-key-here"
"""

import asyncio
import os
import uuid
from datetime import datetime
from typing import List

from watchmen_ai.hypothesis.rag.rag_emb_service import (
    RAGEmbeddingService,
    get_rag_embedding_service,
    store_challenge_content,
    search_similar_content
)
from watchmen_ai.hypothesis.model.common import SimulationResult, ChallengeAnalysisResult
from watchmen_ai.hypothesis.model.analysis import BusinessChallengeWithProblems, BusinessProblemWithHypotheses
from watchmen_ai.dspy.module.challenge_conclusion import ChallengeInsightResult


def create_sample_simulation_result() -> SimulationResult:
    """Create a sample simulation result for testing"""
    
    # Create sample challenge
    challenge = BusinessChallengeWithProblems(
        id=str(uuid.uuid4()),
        title="Customer Retention Analysis",
        description="Analyze factors affecting customer retention and identify improvement opportunities",
        problems=[
            BusinessProblemWithHypotheses(
                id=str(uuid.uuid4()),
                title="High Churn Rate in Q4",
                description="Customer churn rate increased significantly in Q4",
                hypotheses=[]
            ),
            BusinessProblemWithHypotheses(
                id=str(uuid.uuid4()),
                title="Low Customer Satisfaction Scores",
                description="Customer satisfaction scores have been declining",
                hypotheses=[]
            )
        ]
    )
    
    # Create sample analysis result
    insight_result = ChallengeInsightResult(
        answerForConclusion="Customer retention issues are primarily driven by poor onboarding experience and lack of proactive support. Implementing a structured onboarding program and predictive support model could improve retention by 15-20%.",
        summaryForQuestions="Analysis reveals two critical areas: Q4 churn spike correlates with seasonal support capacity constraints, while satisfaction decline links to delayed response times and insufficient self-service options.",
        futureAnalysis="Recommend implementing customer health scoring, expanding support team capacity during peak seasons, and developing comprehensive self-service portal.",
        futureBusinessAction="1. Launch 90-day onboarding program, 2. Implement predictive churn model, 3. Expand support team by 30%, 4. Develop customer success playbooks"
    )
    
    analysis_result = ChallengeAnalysisResult(
        challengeTitle=challenge.title,
        challengeInsightResult=insight_result,
        challengeMarkdown="# Customer Retention Analysis Report\n\nThis report analyzes customer retention challenges...",
        hypothesisAnalysisMarkdownDict={
            "hyp_1": "## Hypothesis Analysis: Onboarding Impact\n\nAnalysis shows strong correlation between onboarding completion and retention...",
            "hyp_2": "## Hypothesis Analysis: Support Response Time\n\nData indicates that response time directly impacts satisfaction scores..."
        },
        questionAnswerMarkdown="## Q&A Analysis\n\n**Q: What causes high churn in Q4?**\nA: Seasonal support capacity constraints and delayed response times..."
    )
    
    # Create simulation result
    simulation_result = SimulationResult(
        simulationId=str(uuid.uuid4()),
        environmentStatus="completed",
        challenge=challenge,
        result=analysis_result
    )
    
    return simulation_result


async def example_store_and_search():
    """Example: Store simulation result and search for similar content"""
    print("=== RAG Embedding Service Example ===")
    
    # Check for OpenAI API key
    if not os.getenv("OPENAI_API_KEY"):
        print("Warning: OPENAI_API_KEY environment variable not set.")
        print("For OpenAI embedding models, please set: export OPENAI_API_KEY='your-key-here'")
        print("Continuing with example...\n")
    
    # Create sample data
    simulation_result = create_sample_simulation_result()
    print(f"Created sample simulation: {simulation_result.simulationId}")
    
    # Get RAG service
    rag_service = get_rag_embedding_service()
    
    try:
        # Store simulation result
        print("\n1. Storing simulation result...")
        document_ids = await store_challenge_content(simulation_result)
        print(f"Stored {len(document_ids)} documents:")
        for doc_id in document_ids:
            print(f"  - {doc_id}")
        
        # Search for similar content
        print("\n2. Searching for similar content...")
        search_queries = [
            "customer retention strategies",
            "churn rate analysis",
            "customer satisfaction improvement",
            "onboarding program effectiveness"
        ]
        
        for query in search_queries:
            print(f"\nSearching for: '{query}'")
            results = await search_similar_content(query, limit=3)
            
            if results:
                print(f"Found {len(results)} similar documents:")
                for i, result in enumerate(results, 1):
                    print(f"  {i}. [{result.document.content_type}] {result.document.challenge_title}")
                    print(f"     Score: {result.score:.4f}, Distance: {result.distance:.4f}")
                    print(f"     Content preview: {result.document.markdown_content[:100]}...")
            else:
                print("  No similar documents found")
        
        # Get documents by simulation ID
        print(f"\n3. Retrieving documents for simulation {simulation_result.simulationId}...")
        sim_documents = await rag_service.get_challenge_by_simulation_id(simulation_result.simulationId)
        print(f"Found {len(sim_documents)} documents for this simulation:")
        for doc in sim_documents:
            print(f"  - {doc.content_type}: {doc.id} (chunk {doc.chunk_index + 1}/{doc.total_chunks})")
        
        # Get database statistics
        print("\n4. Database statistics:")
        stats = await rag_service.get_database_stats()
        print(f"  Total documents: {stats['total_documents']}")
        print(f"  Unique simulations: {stats['unique_simulations']}")
        print(f"  Content types: {stats['content_type_distribution']}")
        print(f"  Embedding model: {stats['embedding_model']}")
        print(f"  Embedding dimension: {stats['embedding_dimension']}")
        
    except Exception as e:
        print(f"Error: {str(e)}")
        raise


async def example_advanced_search():
    """Example: Advanced search with filters"""
    print("\n=== Advanced Search Example ===")
    
    rag_service = get_rag_embedding_service()
    
    # Search with content type filter
    print("\n1. Searching executive summaries only...")
    results = await rag_service.search_similar_challenges(
        query="business strategy and customer retention",
        limit=5,
        content_types=["executive_summary"]
    )
    
    print(f"Found {len(results)} executive summary documents:")
    for result in results:
        print(f"  - {result.document.challenge_title} (Score: {result.score:.4f})")
    
    # Search with multiple content types
    print("\n2. Searching analysis content only...")
    results = await rag_service.search_similar_challenges(
        query="hypothesis testing and data analysis",
        limit=5,
        content_types=["hypothesis_analysis", "question_answer"]
    )
    
    print(f"Found {len(results)} analysis documents:")
    for result in results:
        print(f"  - [{result.document.content_type}] {result.document.challenge_title}")
        print(f"    Score: {result.score:.4f}")


async def example_cleanup():
    """Example: Clean up test data"""
    print("\n=== Cleanup Example ===")
    
    rag_service = get_rag_embedding_service()
    
    # Get all simulations
    stats = await rag_service.get_database_stats()
    print(f"Current database has {stats['total_documents']} documents from {stats['unique_simulations']} simulations")
    
    # Note: In a real scenario, you would specify actual simulation IDs to delete
    # For this example, we'll just show how the deletion would work
    print("\nTo delete a specific simulation's documents:")
    print("  deleted_count = await rag_service.delete_simulation_documents('simulation_id')")
    print("  print(f'Deleted {deleted_count} documents')")


async def main():
    """Main example function"""
    try:
        # Run basic example
        await example_store_and_search()
        
        # Run advanced search example
        await example_advanced_search()
        
        # Show cleanup example
        await example_cleanup()
        
        print("\n=== Example completed successfully! ===")
        
    except Exception as e:
        print(f"\nExample failed with error: {str(e)}")
        raise


if __name__ == "__main__":
    # Run the example
    asyncio.run(main())