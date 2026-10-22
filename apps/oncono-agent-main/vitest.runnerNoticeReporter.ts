// Custom vitest reporter. Vitest is not a dependency, so this file imports nothing
// and relies on duck typing for the hooks vitest calls.
export default class RunnerNoticeReporter {
  onInit() {
    process.stdout.write(
      '\n[onco-agent] vitest does not run this project\'s tests (they are node:test).\n' +
        '             Run:  npm test        -> tsx --test, unit suites\n' +
        '             Or:   npm run verify  -> live end-to-end, boots the server\n\n'
    );
  }
}
