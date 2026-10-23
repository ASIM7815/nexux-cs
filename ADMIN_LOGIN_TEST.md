# Admin login verification

Admin credentials are deliberately not stored in this repository. Set these only in your local environment before testing:

```bash
ADMIN_TEST_USERNAME="your-admin-username" \
ADMIN_TEST_PASSWORD="your-admin-password" \
npm run test:login
```

The check is read-only: it verifies that the account exists and that the supplied password matches. It does not create accounts or reset passwords.

For initial setup, use `ADMIN_SEED_USERNAME` and `ADMIN_SEED_PASSWORD` with `npm run db:seed`. Change the seeded password before deploying.
