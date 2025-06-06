# import re
# import tempfile
# from pathlib import Path
# from typing import Union
# from urllib.parse import unquote
#
# SUPPORT_URL_CONTENT_TYPES = ['application/pdf', 'text/plain', 'application/json']
# USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
#
#
# class ExtractProcessor:
#     @classmethod
#     def load_from_upload_file(cls, upload_file: UploadFile, return_text: bool = False, is_automatic: bool = False) \
#             -> Union[list[Document], str]:
#         extract_setting = ExtractSetting(
#             datasource_type="upload_file",
#             upload_file=upload_file,
#             document_model='text_model'
#         )
#         if return_text:
#             delimiter = '\n'
#             return delimiter.join([document.page_content for document in cls.extract(extract_setting, is_automatic)])
#         else:
#             return cls.extract(extract_setting, is_automatic)
#
#     @classmethod
#     def load_from_url(cls, url: str, return_text: bool = False) -> Union[list[Document], str]:
#         response = ssrf_proxy.get(url, headers={
#             "User-Agent": USER_AGENT
#         })
#
#         with tempfile.TemporaryDirectory() as temp_dir:
#             suffix = Path(url).suffix
#             if not suffix and suffix != '.':
#                 # get content-type
#                 if response.headers.get('Content-Type'):
#                     suffix = '.' + response.headers.get('Content-Type').split('/')[-1]
#                 else:
#                     content_disposition = response.headers.get('Content-Disposition')
#                     filename_match = re.search(r'filename="([^"]+)"', content_disposition)
#                     if filename_match:
#                         filename = unquote(filename_match.group(1))
#                         suffix = '.' + re.search(r'\.(\w+)$', filename).group(1)
#
#             file_path = f"{temp_dir}/{next(tempfile._get_candidate_names())}{suffix}"
#             with open(file_path, 'wb') as file:
#                 file.write(response.content)
#             extract_setting = ExtractSetting(
#                 datasource_type="upload_file",
#                 document_model='text_model'
#             )
#             if return_text:
#                 delimiter = '\n'
#                 return delimiter.join([document.page_content for document in cls.extract(
#                     extract_setting=extract_setting, file_path=file_path)])
#             else:
#                 return cls.extract(extract_setting=extract_setting, file_path=file_path)
#
#     @classmethod
#     def extract(cls, extract_setting: ExtractSetting, is_automatic: bool = False,
#                 file_path: str = None) -> list[Document]:
#         if extract_setting.datasource_type == DatasourceType.FILE.value:
#             with tempfile.TemporaryDirectory() as temp_dir:
#                 if not file_path:
#                     upload_file: UploadFile = extract_setting.upload_file
#                     suffix = Path(upload_file.key).suffix
#                     file_path = f"{temp_dir}/{next(tempfile._get_candidate_names())}{suffix}"
#                     storage.download(upload_file.key, file_path)
#                 input_file = Path(file_path)
#                 file_extension = input_file.suffix.lower()
#                 etl_type = dify_config.ETL_TYPE
#                 unstructured_api_url = dify_config.UNSTRUCTURED_API_URL
#                 unstructured_api_key = dify_config.UNSTRUCTURED_API_KEY
#                 if etl_type == 'Unstructured':
#                     if file_extension == '.xlsx' or file_extension == '.xls':
#                         extractor = ExcelExtractor(file_path)
#                     elif file_extension == '.pdf':
#                         extractor = PdfExtractor(file_path)
#                     elif file_extension in ['.md', '.markdown_body']:
#                         extractor = UnstructuredMarkdownExtractor(file_path, unstructured_api_url) if is_automatic \
#                             else MarkdownExtractor(file_path, autodetect_encoding=True)
#                     elif file_extension in ['.htm', '.html']:
#                         extractor = HtmlExtractor(file_path)
#                     elif file_extension in ['.docx']:
#                         extractor = WordExtractor(file_path, upload_file.tenant_id, upload_file.created_by)
#                     elif file_extension == '.csv':
#                         extractor = CSVExtractor(file_path, autodetect_encoding=True)
#                     elif file_extension == '.msg':
#                         extractor = UnstructuredMsgExtractor(file_path, unstructured_api_url)
#                     elif file_extension == '.eml':
#                         extractor = UnstructuredEmailExtractor(file_path, unstructured_api_url)
#                     elif file_extension == '.ppt':
#                         extractor = UnstructuredPPTExtractor(file_path, unstructured_api_url, unstructured_api_key)
#                     elif file_extension == '.pptx':
#                         extractor = UnstructuredPPTXExtractor(file_path, unstructured_api_url)
#                     elif file_extension == '.xml':
#                         extractor = UnstructuredXmlExtractor(file_path, unstructured_api_url)
#                     elif file_extension == 'epub':
#                         extractor = UnstructuredEpubExtractor(file_path, unstructured_api_url)
#                     else:
#                         # txt
#                         extractor = UnstructuredTextExtractor(file_path, unstructured_api_url) if is_automatic \
#                             else TextExtractor(file_path, autodetect_encoding=True)
#                 else:
#                     if file_extension == '.xlsx' or file_extension == '.xls':
#                         extractor = ExcelExtractor(file_path)
#                     elif file_extension == '.pdf':
#                         extractor = PdfExtractor(file_path)
#                     elif file_extension in ['.md', '.markdown_body']:
#                         extractor = MarkdownExtractor(file_path, autodetect_encoding=True)
#                     elif file_extension in ['.htm', '.html']:
#                         extractor = HtmlExtractor(file_path)
#                     elif file_extension in ['.docx']:
#                         extractor = WordExtractor(file_path, upload_file.tenant_id, upload_file.created_by)
#                     elif file_extension == '.csv':
#                         extractor = CSVExtractor(file_path, autodetect_encoding=True)
#                     elif file_extension == 'epub':
#                         extractor = UnstructuredEpubExtractor(file_path)
#                     else:
#                         # txt
#                         extractor = TextExtractor(file_path, autodetect_encoding=True)
#                 return extractor.extract()
#         elif extract_setting.datasource_type == DatasourceType.NOTION.value:
#             extractor = NotionExtractor(
#                 notion_workspace_id=extract_setting.notion_info.notion_workspace_id,
#                 notion_obj_id=extract_setting.notion_info.notion_obj_id,
#                 notion_page_type=extract_setting.notion_info.notion_page_type,
#                 document_model=extract_setting.notion_info.document,
#                 tenant_id=extract_setting.notion_info.tenant_id,
#             )
#             return extractor.extract()
#         elif extract_setting.datasource_type == DatasourceType.WEBSITE.value:
#             if extract_setting.website_info.provider == 'firecrawl':
#                 extractor = FirecrawlWebExtractor(
#                     url=extract_setting.website_info.url,
#                     job_id=extract_setting.website_info.job_id,
#                     tenant_id=extract_setting.website_info.tenant_id,
#                     mode=extract_setting.website_info.mode,
#                     only_main_content=extract_setting.website_info.only_main_content
#                 )
#                 return extractor.extract()
#             else:
#                 raise ValueError(f"Unsupported website provider: {extract_setting.website_info.provider}")
#         else:
#             raise ValueError(f"Unsupported datasource type: {extract_setting.datasource_type}")
