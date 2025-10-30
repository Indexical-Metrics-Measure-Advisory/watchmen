FROM public.ecr.aws/lambda/python:3.12

WORKDIR    /opt/mssql
RUN        dnf -y update && dnf -y install gcc g++ sudo \
           && curl https://packages.microsoft.com/config/rhel/9/prod.repo | sudo tee /etc/yum.repos.d/mssql-release.repo \
		   && sudo ACCEPT_EULA=Y dnf -y install msodbcsql18


WORKDIR    /opt/oracle
RUN        dnf -y update && sudo dnf -y install libaio wget unzip ldconfig \
            && wget https://download.oracle.com/otn_software/linux/instantclient/213000/instantclient-basiclite-linux.x64-21.3.0.0.0.zip \
            && unzip instantclient-basiclite-linux.x64-21.3.0.0.0.zip \
            && rm -f instantclient-basiclite-linux.x64-21.3.0.0.0.zip \
            && cd /opt/oracle/instantclient* \
            && rm -f *jdbc* *occi* *mysql* *README *jar uidrvci genezi adrci \
            && sudo sh -c "echo /opt/oracle/instantclient* > /etc/ld.so.conf.d/oracle-instantclient.conf" \
            && sudo ldconfig

# Copy function code
COPY ./src/ ${LAMBDA_TASK_ROOT}

# Install the function's dependencies using file pyproject.toml
# from your project folder.
WORKDIR /app
ADD . .

RUN pip3 install cx_Oracle && pip3 install poetry && poetry config virtualenvs.create false && poetry install --without dev -vv

# Set the CMD to your handler (could also be done as a parameter override outside of the Dockerfile)
CMD [ "lambda-handler.main" ]