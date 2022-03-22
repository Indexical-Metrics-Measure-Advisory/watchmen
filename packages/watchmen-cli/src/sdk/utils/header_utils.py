

def build_headers(token):
    headers = {"Content-Type": "application/json","Authorization":"Bearer "+token}
    return headers

def build_pat_headers(site):
    headers = {"Content-Type": "application/json", "Authorization": "pat " + site["pat"]}
    return headers
