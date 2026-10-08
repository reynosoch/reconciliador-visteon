"""Compatibility entrypoint. Local HTTP control is retired; no listening socket is opened."""
from bot_extractor import main

if __name__ == '__main__':
    main()
