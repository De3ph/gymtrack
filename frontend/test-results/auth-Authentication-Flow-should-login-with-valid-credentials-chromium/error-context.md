# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - generic [ref=e3]:
    - heading "GymTrack" [level=1] [ref=e5]
    - generic [ref=e6]:
      - heading "Login to Your Account" [level=2] [ref=e7]
      - generic [ref=e8]:
        - generic [ref=e9]:
          - generic [ref=e10]: Email
          - textbox "Email" [ref=e11]
        - generic [ref=e12]:
          - generic [ref=e13]: Password
          - textbox "Password" [ref=e14]
        - button "Login" [ref=e15]
      - paragraph [ref=e16]:
        - text: Don't have an account?
        - link "Sign up" [ref=e17] [cursor=pointer]:
          - /url: /register
  - button "Open Next.js Dev Tools" [ref=e23] [cursor=pointer]:
    - img [ref=e24]
  - alert [ref=e27]
```