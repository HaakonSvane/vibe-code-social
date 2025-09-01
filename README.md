# The Hitchhikers Guide to Vibe Coding
Welcome to Connascence's first Code Social of the year.

In this Code Social, you will be testing out the latest and greatest AI-tech that is enabled for us developers in Bouvet.
We will be coding using Agent mode (VS Code or any preffered IDE that supports it) to create a fullstack application of your liking.

Depending on how far you come, we will progressively add more and more to the stack, until it hopefully resembles a something we are used to from work.

# How do I procede from here?
After you have been assigned a pairing, your task is to create any full-stack application you'd like. You may use gen AI to help iron out an idea you have, or head into the `./app-ideas` directory for a set of ideas to get you started. The ideas mainly serve as a guideline, and you (and your AI partner) may of course modify them to you and your parntner(s) likings.

If you don't want to bother too much with boilerplate setup, a frontend SPA (Vite React) client and a dotnet web api with EF core has been set up for you to use as a basis. These can be found in `./boilerplate/frontend` and `./boilerplate/backend` respectively. If you prefer to implement your app with different technology, I trust you know how to set it up.

## AI tips and tricks
After messing around with agent mode for a couple of months, experiences learned on the way that might help you get better results are found in `./ai-tips.md`. Note that this is tested on VS Code only. Most commonly used IDE's (Visual Studio, Rider) support AI chat, but all features mentioned in this post have not been tested.

### App registrations
For AuthN/Z, we have created two app registrations for you to mess around with in the Bouvet tenant:

__vibe code social - client: {client id}__
> Has API permissions to vibe code social - api
 

__vibe code social - api: {client id}__
> Let me know if you need a secret for authentication.