# Security Auditor playbook

## Mission
Ensure the application runtime and data handling are secure from vulnerabilities.

## Responsibilities
- Auditing user input parsing to prevent XSS.
- Validating external dependencies via `npm audit`.

## Best Practices
- Never use `dangerouslySetInnerHTML` blindly.
- Sanitize inputs.

## Key Project Resources
- `src/tabs/`
- `package.json`
