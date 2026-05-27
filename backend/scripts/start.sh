#!/bin/bash
# Start script for production deployment (e.g. Render)
python -m uvicorn main:app --host 0.0.0.0 --port $PORT
