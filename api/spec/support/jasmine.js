export default {
  spec_dir: "spec",
  spec_files: [
    "**/*[sS]pec.ts"
  ],
  helpers: [
    "helpers/**/*.ts"
  ],
  reporters: [
    {
      name: "jasmine-spec-reporter#SpecReporter"
    }
  ],
  stopSpecOnExpectationFailure: false,
  random: true
}; 