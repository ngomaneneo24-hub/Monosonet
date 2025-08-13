# Sonet Social App

Welcome friends! This is the codebase for the Sonet Social app.

Get the app itself:

- **Web: [sonet.app](https://sonet.app)**
- **iOS: [App Store](https://apps.apple.com/us/app/sonet-social/id6444370199)**
- **Android: [Play Store](https://play.google.com/store/apps/details?id=xyz.sonet.app)**

## Development Resources

This is a [React Native](https://reactnative.dev/) application, written in the TypeScript programming language. It builds on the Sonet API client and types, which are designed for the centralized Sonet social media platform.

There is a small amount of Go language source code (in `./sonetweb/`), for a web service that returns the React Native Web application.

The [Build Instructions](./docs/build.md) are a good place to get started with the app itself.

Sonet is a centralized social media platform built with modern web technologies. You don't *need* to understand the Sonet architecture to work with this application, but it can help. Learn more at:

- [Sonet Platform Overview](https://sonet.app/about)
- [API Documentation](https://docs.sonet.app)
- [Developer Resources](https://developer.sonet.app)
- [Community Guidelines](https://sonet.app/community)

The Sonet Social application encompasses a set of schemas and APIs built for the Sonet platform. The namespace for these APIs is `app.sonet.*`.

## Contributions

> [!NOTE]
> While we do accept contributions, we prioritize high quality issues and pull requests. Adhering to the below guidelines will ensure a more timely review.

**Rules:**

- We may not respond to your issue or PR.
- We may close an issue or PR without much feedback.
- We may lock discussions or contributions if our attention is getting DDOSed.
- We're not going to provide support for build issues.

**Guidelines:**

- Check for existing issues before filing a new one please.
- Open an issue and give some time for discussion before submitting a PR.
- Stay away from PRs like...
  - Changing "Note" to "Post."
  - Refactoring the codebase, e.g., to replace React Query with Redux Toolkit or something.
  - Adding entirely new features without prior discussion. 

Remember, we serve a wide community of users. Our day-to-day involves us constantly asking "which top priority is our top priority." If you submit well-written PRs that solve problems concisely, that's an awesome contribution. Otherwise, as much as we'd love to accept your ideas and contributions, we really don't have the bandwidth. That's what forking is for!

## Forking guidelines

You have our blessing 🪄✨ to fork this application! However, it's very important to be clear to users when you're giving them a fork.

Please be sure to:

- Change all branding in the repository and UI to clearly differentiate from Sonet.
- Change any support links (feedback, email, terms of service, etc) to your own systems.
- Replace any analytics or error-collection systems with your own so we don't get super confused.

## Security disclosures

If you discover any security issues, please send an email to security@sonet.app. The email is automatically CC'd to the entire team and we'll respond promptly.

## Are you a developer interested in building on Sonet?

Sonet is an open social network built with modern web technologies, designed to provide a seamless developer experience. With Sonet, third-party integration can be as seamless as first-party through custom feeds, services, clients, and more.

## License (MIT)

See [./LICENSE](./LICENSE) for the full license.

## P.S.

We ❤️ you and all of the ways you support us. Thank you for making Sonet a great place!

## Sonet API Integration

This application is built to work with the Sonet social media platform. The Sonet API client and types are located in `src/api/` and `src/types/` respectively. If you see `Module not found: Can't resolve '@sonet/api'` ensure:

1. The Sonet API client is properly configured in `src/api/sonet-client.ts`.
2. Clear Metro/Expo caches: `rm -rf .expo .cache && expo start --web --clear`.
3. TypeScript server picked up updated `tsconfig.json` (restart editor if needed).

The Sonet API provides centralized social media functionality including notes, users, timelines, and real-time interactions.
