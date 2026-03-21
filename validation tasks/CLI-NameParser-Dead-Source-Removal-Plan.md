# CLI NameParser Dead Source Removal Plan

Status: COMPLETED

## Goal

Remove `src/cli/utils/nameParser.ts` because it is an unreferenced zero-byte source file that only inflates the real coverage denominator.

## Evidence

- file size was `0`
- no source, docs, package, or validation references to `nameParser`

## Rule

Do not replace dead empty source with synthetic behavior only to satisfy coverage.

## Validation artifact

- `src/lab_test/cli.nameparser.dead-source.logic.test.ts`
