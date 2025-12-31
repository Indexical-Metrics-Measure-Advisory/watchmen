# Watchmen Quick Start

Welcome to the Watchmen playground! This guide will help you set up a local environment to explore the platform's features.

> **⚠️ Important**: This environment is designed for **testing and demonstration purposes only**. It is NOT suitable for production use.
> For production deployment, please refer to the [Production Environment Deployment Guide](https://imma-watchmen.com/docs/16.0/installation/deploy#production-environment).

---

## 🚀 Installation & Setup

You can run Watchmen using either **MySQL** or **PostgreSQL** as the storage engine. Choose the option that fits your needs.

### Option 1: Using MySQL

1.  **Navigate to the docker directory**:
    ```bash
    cd docker
    ```

2.  **Initialize database scripts**:
    ```bash
    chmod +x dbscript.sh
    ./dbscript.sh
    ```

3.  **Start services**:
    ```bash
    docker compose -f docker-compose-mysql.yml up -d
    ```

### Option 2: Using PostgreSQL

1.  **Navigate to the docker directory**:
    ```bash
    cd docker
    ```

2.  **Initialize database scripts**:
    ```bash
    chmod +x dbscript_pg.sh
    ./dbscript_pg.sh
    ```

3.  **Start services**:
    ```bash
    docker compose -f docker-compose-pg.yml up -d
    ```

---

## 💻 Accessing the Platform

Once the services are up and running, you can access the web console at:

👉 **[http://localhost:3030](http://localhost:3030)**

### Default Accounts

Use the following credentials to log in and explore different roles:

| Role | Username | Password | ID |
| :--- | :--- | :--- | :--- |
| **Super User** | `imma-super` | `change-me` | 1 |
| **Admin User** | `imma-admin` | `1234abcd` | 2 |
| **Console User** | `imma-user` | `1234abcd` | 3 |

---

## 🎮 Playground Workflow

Follow this general process to experience the full data lifecycle in Watchmen.

### 1. Super User Actions
*Login as `imma-super`*
- **Create Datasource**: Define connections to your external databases.

### 2. Admin User Actions
*Login as `imma-admin`*
- **Data Ingestion (Collection)**:
  - Access the Ingestion Client at **[http://localhost:3031](http://localhost:3031)**.
  - Configure **Modules**, **Models**, and **Tables**.
  - Run tests and monitor data ingestion status.
- **Data Management**:
  - Create **Topics** and **Pipelines**.
  - Test pipelines using the built-in Simulator.
  - Create **PAT** (Personal Access Token) and import test data.
- **Space Management**:
  - Create **Spaces** and assign them to User Groups.

### 3. Console User Actions
*Login as `imma-user`*
- **Visualization & Analysis**:
  - Connect to a Space.
  - Create **Datasets** and **Charts**.
  - Build and share **Dashboards**.

---

## 📝 Notes & Limitations

- **Included Services**: This quick start includes the core platform. **DQC** (Data Quality Center) and **Indicator** services are *not* included.
- **Data Persistence**:
  - Tables are automatically created in the instance database.
  - **Warning**: Modifying a Topic's structure will cause the underlying table to be **dropped and recreated**, resulting in data loss.
- **Configuration**:
  - **Non-Mac Users**: You may need to modify the `docker.for.mac.localhost` parameter in the Nginx configuration.
  - For more details on storage synchronization, refer to the [SYNC_TOPIC_TO_STORAGE documentation](https://imma-watchmen.com/docs/16.1/installation/config/).

---

## 📚 Resources

- **Official Documentation**: [imma-watchmen.com](https://imma-watchmen.com/)
- **Production Deployment**: [Deployment Guide](https://imma-watchmen.com/docs/16.0/installation/deploy#production-environment)
