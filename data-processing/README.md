# data-processing

To install dependencies:

```bash
bun install
```

To run:

```bash
bun run index.ts
```

```bash
bun run index.ts -c -f ./data/abc.csv -o ./out/abc_custom.csv

# or 

bun run index.ts -f ./data/abc.csv -c

```

## Flags

`-f`(required): in file path
`-c`(optional): Combine 
`-o`(optional): out file path. Default: `[in file name]_custom[?_combined]`

This project was created using `bun init` in bun v1.0.26. [Bun](https://bun.sh) is a fast all-in-one JavaScript runtime.
