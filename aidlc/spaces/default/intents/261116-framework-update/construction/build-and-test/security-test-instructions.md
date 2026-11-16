# Security Test Instructions: US-0504

- **No shell:** every call goes through `runFixed` with fixed arguments.
- **Validated input:** the harness id must be a known `setupId`, and an unknown one is refused (tested).
- **Root:** the project root comes from the app's own project list, not from the renderer.
- **No writes:** the app never writes framework files. Updates are typed into the shell for the person to confirm with Enter.
- **No secrets** are read or stored.
