export const slidesData = [
  // ===== GLOBAL TITLE =====
  {
    type: "title",
    title: "Understanding Git Pull, Fetch, and Merge",
    localImagePath: "git.png",
    imageUrl: "https://drive.google.com/uc?id=1M63L4TD6F-JJNDDIL78BQ8HOuGiNBoDX&export=download",
    subtitle: "A clear analogy-based explanation of core Git collaboration commands."
  },

  // ===== MODULE 1 =====
  {
    type: "module_intro",
    moduleLabel: "Module 1",
    title: "Git Pull and Git Fetch",
    bullets: [
      "Difference between git pull and git fetch",
      "Git pull",
      "Git pull code",
      "Git fetch",
      "Git fetch code",
      "Summary"
    ]
  },
  {
    type: "concept",
    title: "Difference Between Git Pull and Git Fetch",
    body:
      "Git pull and git fetch are used to get updates from a remote repository. Git fetch only downloads changes, while git pull downloads and applies those changes to the current branch."
  },
  {
    type: "concept",
    title: "Git Pull",
    body:
      "Git pull is a combination of fetching and merging. It retrieves changes from the remote repository and immediately integrates them into the current working branch."
  },
  {
    type: "code",
    title: "Git Pull Code",
    image: "",
    description:
      "This command fetches the latest changes from the main branch of the remote repository and merges them into the current local branch."
  },
  {
    type: "concept",
    title: "Git Fetch",
    body:
      "Git fetch downloads updates from a remote repository without modifying the local working branch. It allows developers to review changes before merging."
  },
  {
    type: "code",
    title: "Git Fetch Code",
    image: "",
    description:
      "This command retrieves all updates from the remote repository but keeps the local branch unchanged."
  },
  {
    type: "notes",
    title: "Summary",
    bullets: [
      "Git fetch downloads changes without merging.",
      "Git pull fetches and merges changes automatically.",
      "Fetch is safer for reviewing updates before integration."
    ]
  },

  // ===== MODULE 2 =====
  {
    type: "module_intro",
    moduleLabel: "Module 2",
    title: "Git Merging",
    bullets: [
      "Merging in git",
      "Git merge",
      "Git merge code",
      "Summary"
    ]
  },
  {
    type: "concept",
    title: "Merging in Git",
    body:
      "Merging in git is the process of combining changes from different branches into a single branch. It is commonly used to integrate feature branches into the main branch."
  },
  {
    type: "concept",
    title: "Git Merge",
    body:
      "Git merge takes the changes from a specified branch and applies them to the current branch, creating a new merge commit if necessary."
  },
  {
    type: "code",
    title: "Git Merge Code",
    image: "",
    description:
      "This command merges the feature-branch into the currently active branch."
  },
  {
    type: "notes",
    title: "Summary",
    bullets: [
      "Merging combines work from multiple branches.",
      "Git merge preserves commit history.",
      "Conflicts may occur and must be resolved manually."
    ]
  },


  // ===== GLOBAL THANK YOU =====
  {
    type: "thank_you",
    title: "Thank You"
  }
];