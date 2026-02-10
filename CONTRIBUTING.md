# Contributing Guide

## Development Setup

1. Clone the repository
2. Create a virtual environment:
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```
3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
4. Copy `.env.example` to `.env` and configure
5. Start services:
   ```bash
   docker-compose up -d
   ```
6. Initialize database:
   ```bash
   python -m scripts.init_db
   ```

## Code Style

- Follow PEP 8
- Use type hints
- Write docstrings for all functions and classes
- Run `black` and `ruff` before committing

## Testing

Run tests with:
```bash
pytest
```

## Architecture Principles

- SOLID principles
- Modular design
- Clear separation of concerns
- Comprehensive error handling
- Structured logging

