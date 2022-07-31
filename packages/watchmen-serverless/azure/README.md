# Azure Functions
The Blob storage trigger starts a function when a new or updated blob is detected. 
The blob contents are provided as input to the function.

The Azure Blob storage trigger requires a general-purpose storage account. 
Storage V2 accounts with hierarchical namespaces are also supported. 
To use a blob-only account, or if your application has specialized needs, review the alternatives to using this trigger.

About the detail information, please refer to [the official document](https://docs.microsoft.com/en-us/azure/azure-functions/)

The example shows a blob trigger binding in a function.json file and Python code that uses the binding. 
The function triggers a pipeline when a blob is added or updated in the samples-watchmen container.