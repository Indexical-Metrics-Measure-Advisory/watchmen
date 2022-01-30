from watchmen_rest import RestApp
from watchmen_rest_doll.settings import DollSettings

settings = DollSettings()
app = RestApp(settings).construct()
