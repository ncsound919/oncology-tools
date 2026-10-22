export default {
  test: {
    include: [],
    passWithNoTests: true,
    reporters: [['./vitest.runnerNoticeReporter.ts', {}]],
  },
};
