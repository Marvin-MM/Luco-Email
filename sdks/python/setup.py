
from setuptools import setup, find_packages

with open("README.md", "r", encoding="utf-8") as fh:
    long_description = fh.read()

setup(
    name="luco-sdk",
    version="1.0.0",
    author="Luco Team",
    author_email="support@luco.email",
    description="Official Python SDK for the Luco email sending platform",
    long_description=long_description,
    long_description_content_type="text/markdown",
    url="https://github.com/luco/sdk-python",
    packages=find_packages(),
    classifiers=[
        "Development Status :: 4 - Beta",
        "Intended Audience :: Developers",
        "License :: OSI Approved :: MIT License",
        "Operating System :: OS Independent",
        "Programming Language :: Python :: 3",
        "Programming Language :: Python :: 3.7",
        "Programming Language :: Python :: 3.8",
        "Programming Language :: Python :: 3.9",
        "Programming Language :: Python :: 3.10",
        "Programming Language :: Python :: 3.11",
        "Topic :: Communications :: Email",
        "Topic :: Software Development :: Libraries :: Python Modules",
    ],
    python_requires=">=3.7",
    install_requires=[
        "requests>=2.25.0",
    ],
    extras_require={
        "dev": [
            "pytest>=6.0",
            "pytest-cov>=2.0",
            "black>=21.0",
            "flake8>=3.8",
        ],
    },
    keywords="luco email sdk api bulk-email transactional",
    project_urls={
        "Bug Reports": "https://github.com/luco/sdk-python/issues",
        "Source": "https://github.com/luco/sdk-python",
        "Documentation": "https://docs.luco.email",
    },
)
