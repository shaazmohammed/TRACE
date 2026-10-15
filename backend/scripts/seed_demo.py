"""Load the synthetic demo dataset from the command line.

Run from the backend folder:
    python -m scripts.seed_demo              # add missing demo events
    python -m scripts.seed_demo --reset      # wipe ALL data, then reload
    python -m scripts.seed_demo --correlate  # also run correlation afterwards
"""

import argparse

from app.db.session import SessionLocal
from app.services import correlation_service, seed_service


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawTextHelpFormatter)
    parser.add_argument("--reset", action="store_true", help="delete all data before loading")
    parser.add_argument("--correlate", action="store_true", help="run correlation after loading")
    args = parser.parse_args()

    with SessionLocal() as db:
        loader = seed_service.reset_demo_data if args.reset else seed_service.load_demo_events
        inserted, total = loader(db)
        print(f"Inserted {inserted} event(s); {total} event(s) stored.")
        if args.correlate:
            print("Correlation:", correlation_service.run_correlation(db).model_dump())


if __name__ == "__main__":
    main()
