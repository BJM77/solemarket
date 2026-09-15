# Utils Migration Mapping

The `src/lib/utils.ts` barrel file has been refactored to enforce direct imports from specific utility modules. This prevents circular dependencies, improves tree shaking, and avoids silent import resolution errors.

| Function | Old Import | New Import |
| --- | --- | --- |
| `formatPrice` | `@/lib/utils` | `@/lib/utils/format` |
| `formatRelativeTime` | `@/lib/utils` | `@/lib/utils/format` |
| `resizeAndCompressImage` | `@/lib/utils` | `@/lib/utils/image` |
| `processListingImage` | `@/lib/utils` | `@/lib/utils/image` |
| `processListingImages` | `@/lib/utils` | `@/lib/utils/image` |
| `serializeFirestoreData` | `@/lib/utils` | `@/lib/utils/serialization` |
| `safeDate` | `@/lib/utils` | `@/lib/utils/serialization` |
| `getProductUrl` | `@/lib/utils` | `@/lib/utils/url` |
| `slugify` | `@/lib/utils` | `@/lib/utils/url` |
| `cn` | `@/lib/utils` | `@/lib/utils/ui` |

## ESLint Rule
A hard ban has been placed on importing from `@/lib/utils` in `.eslintrc.json`. If you see an error, use the mapping above to find the correct module.
