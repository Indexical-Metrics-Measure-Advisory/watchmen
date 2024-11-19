from langchain.embeddings import AzureOpenAIEmbeddings


class EmbeddingModelBuilder():
    """
    EmbeddingModelCreater
    """

    @staticmethod
    def get_model() -> AzureOpenAIEmbeddings:
        """
        get_model
        :return:
        """

        return AzureOpenAIEmbeddings(azure_deployment="text-embedding-ada-002", chunk_size=1,
                                     azure_endpoint="https://azure-insuremo-openai.openai.azure.com/",
                                     api_key="e115304f78534afa84ce909c0882bcd5", openai_api_version="2022-12-01")
