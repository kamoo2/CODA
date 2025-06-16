# dbc_parser.py
import cantools
import sys
import json

def main():
    if len(sys.argv) < 2:
        print("Usage: dbc_parser.py <path>", file=sys.stderr)
        sys.exit(1)

    path = sys.argv[1]
    dbc = cantools.db.load_file(path)

    result = []
    for msg in dbc.messages:
        result.append({
            "id": msg.frame_id,
            "name": msg.name,
            "dlc": msg.length,
            "signals": [
                {
                    "name": s.name,
                    "startBit": s.start,
                    "length": s.length,
                    "factor": s.scale,
                    "offset": s.offset,
                    "unit": s.unit or ""
                } for s in msg.signals
            ]
        })

    print(json.dumps(result))

if __name__ == "__main__":
    main()