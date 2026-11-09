"""Start Günlük Organizer. Usage: python run.py [--port 8430]"""
import argparse
import logging

import uvicorn

if __name__ == "__main__":
    p = argparse.ArgumentParser()
    p.add_argument("--port", type=int, default=8430)
    p.add_argument("--host", default="127.0.0.1")
    a = p.parse_args()
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(name)s %(levelname)s %(message)s")
    uvicorn.run("app.main:app", host=a.host, port=a.port, proxy_headers=True, server_header=False, log_level="warning")
