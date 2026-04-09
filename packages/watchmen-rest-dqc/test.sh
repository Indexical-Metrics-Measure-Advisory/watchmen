mkdir temp_env && cd temp_env
# Create virtual environment and install dependencies
python3 -m venv venv
source venv/bin/activate
pip install -r ../requirements.txt
pip install venv-pack
# Package the environment (all third-party libs, no editable packages)
venv-pack -o ../environment.tar.gz
deactivate
cd .. && rm -rf temp_env
