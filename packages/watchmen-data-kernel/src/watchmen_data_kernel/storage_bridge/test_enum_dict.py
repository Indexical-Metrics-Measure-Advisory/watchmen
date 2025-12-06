from enum import Enum

class StrOp(str, Enum):
    LEN = 'len'
    UPPER = 'upper'

SUPPORTED = {
    StrOp.LEN: lambda x: len(x),
    StrOp.UPPER: lambda x: x.upper()
}

def test():
    print(f"StrOp.LEN == 'len': {StrOp.LEN == 'len'}")
    print(f"'len' in SUPPORTED: {'len' in SUPPORTED}")
    try:
        print(f"SUPPORTED['len']: {SUPPORTED['len']}")
    except KeyError:
        print("SUPPORTED['len'] raised KeyError")

    # If I use values for keys?
    SUPPORTED_STR = {
        StrOp.LEN.value: lambda x: len(x)
    }
    print(f"'len' in SUPPORTED_STR: {'len' in SUPPORTED_STR}")

if __name__ == "__main__":
    test()
