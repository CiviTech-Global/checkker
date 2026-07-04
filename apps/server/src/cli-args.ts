export interface CliArgs {
  port?: number;
  webDist?: string;
}

export function parseArgs(argv: string[] = process.argv.slice(2)): CliArgs {
  const args: CliArgs = {};
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    switch (arg) {
      case "--port":
      case "-p":
        args.port = parseInt(argv[++i], 10);
        break;
      case "--web-dist":
      case "-w":
        args.webDist = argv[++i];
        break;
    }
  }
  return args;
}
