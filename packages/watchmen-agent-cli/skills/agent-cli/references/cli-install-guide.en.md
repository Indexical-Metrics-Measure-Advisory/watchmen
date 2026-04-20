# watchmen-agent-cli Installation & Upgrade Guide (Optimized)

> Use case: for skill docs / internal team documentation. Goal: **stable, repeatable, and debuggable**.
> TL;DR: install **`watchmen-agent-cli`** (available on PyPI).

---

## 1. Prerequisites

- Python: need   **3.10+** +
- Network access to PyPI (or your mirror / private index)

---

## 2. Standard Install (Recommended: venv)

### macOS / Linux

```bash
python3 -m venv .venv
source .venv/bin/activate

python -m pip install -U pip setuptools wheel
python -m pip install watchmen-agent-cli
```

### Windows (PowerShell)

```powershell
py -m venv .venv
.\.venv\Scripts\Activate.ps1

python -m pip install -U pip setuptools wheel
python -m pip install watchmen-agent-cli
```

---

## 3. If Your Network Is Unstable (Timeout / Retry Hardening)

If you see slow downloads, intermittent failures, or `Read timed out`, use:

```bash
python -m pip install --default-timeout 120 --retries 5 watchmen-agent-cli
```

If it still fails, try disabling cache (sometimes avoids corrupted cache issues):

```bash
python -m pip install --no-cache-dir --default-timeout 180 --retries 10 watchmen-agent-cli
```

---

## 4. Use a Mirror Index (Optional, Recommended in Restricted Networks)

> Strongly recommended for restricted networks or if PyPI is slow. Replace with your company/private index if applicable.

Example using Tsinghua mirror:

```bash
python -m pip install -i https://pypi.tuna.tsinghua.edu.cn/simple \
  --default-timeout 120 --retries 5 \
  watchmen-agent-cli
```

You can also set it globally:

```bash
python -m pip config set global.index-url https://pypi.tuna.tsinghua.edu.cn/simple
python -m pip config set global.timeout 120
```

---

## 5. Upgrade / Pin a Version

### Upgrade to latest

```bash
python -m pip install -U watchmen-agent-cli
```

### Pin a specific version (recommended for reproducible builds)

```bash
python -m pip install "watchmen-agent-cli==16.6.20"
```

---

## 6. Verify Installation

```bash
python -m pip show watchmen-agent-cli
watchmen --help
```

If the `watchmen` command is not found, verify you're using the correct Python/venv:

```bash
python -m pip list | grep watchmen
python -c "import sys; print(sys.executable)"
```

---

## 7. Uninstall

```bash
python -m pip uninstall -y watchmen-agent-cli
```

> If you used a venv, the cleanest reset is deleting `.venv/` and recreating it.

---

## 8. FAQ / Common Pitfalls

### 8.1 Why does `pip install watchmen-agent-cli` fail?

If pip reports:

- `No matching distribution found for watchmen-agent-cli`

Possible causes and solutions:

- **Network issue**: Check your internet connection or try a mirror index (see Section 4).
- **Python version**: Ensure Python **3.10+** is installed (`python --version`).
- **Typo**: Double-check the package name is exactly `watchmen-agent-cli` (not `watchmen-cli`).

### 8.2 pip upgrade times out — what should I do?

On unstable networks, upgrading pip can be more error-prone. You can skip upgrading pip and install directly:

```bash
python -m pip install --default-timeout 120 --retries 5 watchmen-agent-cli
```

Then upgrade pip later if needed:

```bash
python -m pip install -U pip
```

### 8.3 Still timing out?

Use a mirror index (Section 4) or switch to offline installation (Section 9).

---

## 9. Offline / Air-gapped Install (Enterprise-friendly)

On a machine with internet access, download wheels:

```bash
python -m pip download -d dist --only-binary=:all: watchmen-agent-cli
```

Copy the `dist/` folder to the target machine, then install offline:

```bash
python -m pip install --no-index --find-links dist watchmen-agent-cli
```
