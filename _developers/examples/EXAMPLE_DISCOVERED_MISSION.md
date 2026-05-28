# Mission: Improve Test Coverage for Core Functions

Enhance the test coverage of agentic-lib's core utility functions, focusing on the `countSourceTodos` function and error handling patterns that are currently untested but critical to system reliability.

## Current State

The project is a mature Node.js SDK for agentic coding workflows with excellent overall test coverage (435 tests passing across 27 test files). However, some core utility functions lack dedicated unit tests:

- `countSourceTodos` function in `src/actions/agentic-step/index.js` (lines 46-67) - recursively counts TODO/FIXME comments in source files
- Error handling patterns in filesystem operations need edge case validation
- Path validation and directory traversal safety could be strengthened

## Objectives

1. **Add comprehensive unit tests for `countSourceTodos` function**
   - Test with empty directory
   - Test with nested directory structures
   - Test with different file extensions (.js, .ts, .mjs)
   - Test with files containing multiple TODO patterns (TODO, todo, Todo)
   - Test with files containing FIXME comments (currently not counted but mentioned in docs)
   - Test edge cases: permission errors, binary files, symlinks

2. **Add test cases for error handling in config-loader**
   - Test `readPackageJson` function with invalid paths
   - Test TOML parsing with malformed files
   - Test path resolution edge cases

3. **Add tests for path safety in safety module**
   - Test `isPathWritable` with edge cases: relative paths, parent directory traversal (../), symlinks
   - Validate behavior with non-existent paths
   - Test Windows vs Unix path handling

4. **Improve `countSourceTodos` functionality**
   - Update regex to include FIXME comments as documented
   - Add support for common comment patterns: `// TODO:`, `/* TODO */`, `# TODO`
   - Ensure consistent case-insensitive matching

## Acceptance Criteria

1. **Test Coverage**: New test file `tests/actions/agentic-step/count-source-todos.test.js` with minimum 15 test cases
2. **Function Enhancement**: `countSourceTodos` counts both TODO and FIXME patterns correctly
3. **Edge Case Handling**: All error scenarios (file permissions, missing directories) are handled gracefully
4. **Documentation Alignment**: Function behavior matches JSDoc comments
5. **All Tests Pass**: Existing test suite continues to pass (435+ tests)
6. **Path Security**: `isPathWritable` function has comprehensive edge case coverage in existing safety tests
