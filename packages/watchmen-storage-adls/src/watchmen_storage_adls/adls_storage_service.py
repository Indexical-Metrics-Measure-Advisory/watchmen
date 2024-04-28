import json
from logging import getLogger
from typing import List, Dict, Any, Tuple, Optional

from azure.core.exceptions import ResourceExistsError
from azure.storage.filedatalake import DataLakeServiceClient, DataLakeDirectoryClient, FileSystemClient
from azure.identity import DefaultAzureCredential, ClientSecretCredential
from watchmen_model.system import DataSourceParam
from watchmen_utilities import ArrayHelper, serialize_to_json

logger = getLogger(__name__)


class AzureDataLakeStorageService:

    def __init__(self, account_name: str, file_system_name: str, params: List[DataSourceParam]):
        self.account_name = account_name
        self.account_key = self.get_param("account_key", params)
        self.sas_token = self.get_param("sas_token", params)
        self.service_client = self.get_data_lake_service_client(params)
        self.file_system_name = file_system_name
        self.file_system_client = self.get_file_system_client(self.service_client, self.file_system_name)
        self.directories = set()

    def get_data_lake_service_client(self, params: List[DataSourceParam]) -> DataLakeServiceClient:
        account_name = self.account_name
        credential = self.get_credential(params)
        return self.authenticate(account_name, credential)

    def get_credential(self, params: List[DataSourceParam]) -> Any:
        auth_type = self.get_param("auth_type", params)
        if auth_type == "sas":
            return self.get_sas_token()
        elif auth_type == "key":
            return self.get_account_key()
        else:
            return self.get_default_credential()

    # noinspection PyMethodMayBeStatic
    def get_param(self, name: str, params: List[DataSourceParam]) -> Optional[str]:
        def find_param(param: DataSourceParam) -> Tuple[bool, Optional[str]]:
            if param.name == name:
                return True, param.value
            else:
                return False, None

        return ArrayHelper(params).first(find_param)

    # noinspection PyMethodMayBeStatic
    def authenticate(self, account_name, credential) -> DataLakeServiceClient:
        account_url = f"https://{account_name}.dfs.core.windows.net"
        service_client = DataLakeServiceClient(account_url, credential=credential)
        return service_client

    # noinspection PyMethodMayBeStatic
    def get_default_credential(self) -> Any:
        """
        application service principal:
            add environment variables:
                AZURE_CLIENT_ID → Application ID
                AZURE_TENANT_ID → Tenant ID
                AZURE_CLIENT_SECRET → generated password/credential for application
        developer account:
            app identity obtained from developer tools:
                Azure CLI
                Azure PowerShell
                Azure developer CLI
                Interactive browser
        Azure Managed Identity
        """
        return DefaultAzureCredential()

    # noinspection PyMethodMayBeStatic
    def get_client_secret_credential(self, tenant_id, client_id, client_secret) -> Any:
        return ClientSecretCredential(tenant_id, client_id, client_secret)

    def get_sas_token(self) -> str:
        return self.sas_token

    def get_account_key(self) -> str:
        return self.account_key

    # noinspection PyMethodMayBeStatic
    def get_file_system_client(self, service_client: DataLakeServiceClient, file_system_name: str) -> FileSystemClient:
        file_system_client = service_client.get_file_system_client(file_system=file_system_name)
        return file_system_client

    def create_directory(self, directory_name: str) -> DataLakeDirectoryClient:

        if directory_name in self.directories:
            return self.get_directory_client(directory_name)

        try:
            directory_client = self.file_system_client.create_directory(directory_name)
            self.directories.add(directory_name)
            return directory_client
        except ResourceExistsError:
            self.directories.add(directory_name)
            return self.get_directory_client(directory_name)

    # noinspection PyMethodMayBeStatic
    def get_directory_client(self, directory_name: str) -> DataLakeDirectoryClient:
        directory_client = self.file_system_client.get_directory_client(directory_name)
        return directory_client

    # noinspection PyMethodMayBeStatic
    def generate_file_name(self, row: Dict) -> str:
        file_name = str(row['id_'])
        return file_name

    # noinspection PyMethodMayBeStatic
    def create_file(self, directory_client: DataLakeDirectoryClient, file_name: str, data_: Dict):
        file_client = directory_client.get_file_client(file_name)
        data_json = serialize_to_json(data_)

        file_client.create_file()
        file_client.append_data(data_json, offset=0, length=len(data_json))
        file_client.flush_data(len(data_json))

    # noinspection PyMethodMayBeStatic
    def delete_file(self,  directory_client: DataLakeDirectoryClient, file_name: str):
        file_client = directory_client.get_file_client(file_name)
        return file_client.delete_file()

    # noinspection PyMethodMayBeStatic
    def get_file(self, directory_client: DataLakeDirectoryClient, file_name: str) -> Dict:
        file_client = directory_client.get_file_client(file_name)
        download = file_client.download_file()
        downloaded_bytes = download.readall()
        file_content = downloaded_bytes.decode('utf-8')
        return json.loads(file_content)
