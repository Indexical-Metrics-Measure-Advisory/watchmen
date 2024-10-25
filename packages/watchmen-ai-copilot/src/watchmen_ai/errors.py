class ProviderTokenNotInitError(Exception):
    """
    Custom exception raised when the provider token is not initialized.
    """
    description = "Provider Token Not Init"

    def __init__(self, *args, **kwargs):
        self.description = args[0] if args else self.description
