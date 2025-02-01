from setuptools import setup, find_packages

setup(
    name="aimail",
    version="0.1.0",
    packages=find_packages(),
    install_requires=[
        "aiohttp>=3.8.0",
        "python-dotenv>=0.19.0",
        "psutil>=5.8.0",
        "asyncio>=3.4.3",
        "openai>=1.0.0",
        "python-dateutil>=2.8.2",
        "markdown>=3.3.0",
        "beautifulsoup4>=4.12.2",
        "structlog>=24.1.0",
        "email-validator>=2.2.0"
    ],
    python_requires=">=3.8",
) 