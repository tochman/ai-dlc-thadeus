# Deployment Pipeline — frågor

Inga nya frågor. Release-strategin bestämdes i EPIC-01 och gäller fortfarande:
- GitHub Releases via Actions
- taggar `vX.Y.Z`
- universal `.dmg` för macOS och `.deb` (x64) för Linux

Den här rättelsen ändrar bara var Linux-bygget körs (`ubuntu-22.04`), lägger till en glibc-kontroll och låter workflowen bygga på pull requests utan att publicera. Användaren gav själv riktningen ("we need to change build-linux runs-on", 2026-11-13).
