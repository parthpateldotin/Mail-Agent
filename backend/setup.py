from setuptools import setup, find_packages

setup(
    name="aimail",
    version="0.1.0",
    packages=find_packages(),
    install_requires=[
        "fastapi>=0.104.0",
        "uvicorn>=0.24.0",
        "sqlalchemy>=2.0.0",
        "alembic>=1.12.0",
        "asyncpg>=0.29.0",
        "python-jose>=3.3.0",
        "passlib>=1.7.4",
        "python-multipart>=0.0.6",
        "email-validator>=2.1.0",
        "python-json-logger>=2.0.7",
        "prometheus-fastapi-instrumentator>=6.1.0",
    ],
    extras_require={
        "dev": [
            "pytest>=7.4.0",
            "pytest-asyncio>=0.21.0",
            "pytest-cov>=4.1.0",
            "black>=23.9.0",
            "isort>=5.12.0",
            "flake8>=6.1.0",
            "mypy>=1.5.0",
        ],
    },
    python_requires=">=3.10",
) 