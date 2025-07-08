const typeDefs = `
  type User {
    id: ID!
    username: String!
    displayName: String!
    pfpUrl: String!
    joinDate: String!
    bio: String
    website: String
    passwordHash: String
    provider: String
    providerProfileId: String
    followers: [User]
    following: [User]
    posts: [Post]
    likedPosts: [Post]
    comments: [Comment]
    likedComments: [Comment]
    reposts: [Repost]
    triggeredNotifications: [Notification]
    receivedNotifications: [Notification]
    rooms: [Room]
    messages: [Message]
  }

  type Post {
    id: ID!
    timestamp: String!
    text: String!
    feedItemType: String!
    imageUrl: String
    poll: Poll
    user: User!
    likes: [User]
    comments: [Comment]
    reposts: [Repost]
    notifications: [Notification]
  }

  type Poll {
    id: ID!
    choices: [String]
    voters: [Int]
    choice1Votes: [Int]
    choice2Votes: [Int]
    choice3Votes: [Int]
    choice4Votes: [Int]
    choice5Votes: [Int]
    choice6Votes: [Int]
    post: Post!
  }

  type Comment {
    id: ID!
    timestamp: String!
    text: String!
    feedItemType: String!
    imageUrl: String
    user: User!
    post: Post!
    parent: Comment
    likes: [User]
    replies: [Comment]
    reposts: [Repost]
    notifications: [Notification]
  }

  type Repost {
    id: ID!
    timestamp: String!
    feedItemType: String!
    user: User!
    post: Post
    comment: Comment
  }

  type Notification {
    id: ID!
    timestamp: String!
    type: String!
    isRead: Boolean
    sourceUser: User!
    targetUser: User!
    post: Post
    comment: Comment
  }

  type Room {
    id: ID!
    lastUpdated: String!
    users: [User]
    messages: [Message]
  }

  type Message {
    id: ID!
    timestamp: String!
    text: String!
    imageUrl: String
    user: User!
    room: Room!
  }

  type LoginResponse {
    user: User!
    token: String!
  }

  type Query {
    getListedUsers: [User]
    searchUsers(query: String!, userId: ID): [User]
    getCurrentUser: User
    getUser(userId: ID!): User
    getFollowing(userId: ID!, paginationId: ID): [User]
    getFollowers(userId: ID!, paginationId: ID): [User]
    getMutuals(userId: ID!, paginationId: ID): [User]
    getFfs(userId: ID!, paginationId: ID): [User]

    # getIndexPosts(postId: ID, repostId: ID): [Post]
    # refreshIndexPosts(timestamp: String!): [Post]

    searchPosts(query: String!, postId: ID): [Post]
    getPost(postId: ID!): Post

    # getUserPosts(userId: ID!, postId: ID, repostId: ID): [Post]
    # getImagePosts(userId: ID!, postId: ID, repostId: ID): [Post]
    # getLikedPosts(userId: ID!, postId: ID, repostId: ID): [Post]

    getComment(commentId: ID!): Comment
    getUserComments(userId: ID!, commentId: ID): [Comment]
    getPostComments(postId: ID!, commentId: ID): [Comment]
    getReplies(commentId: ID!, replyId: ID): [Comment]
    getAllRooms(roomId: ID): [Room]
    getRoom(roomId: ID!): Room
    getMessages(roomId: ID!, messageId: ID): [Message]
    getNotifications: [Notification]
    refreshNotifications: [Notification]
  }

  type Mutation {
    localLogin(username: String!, password: String!): LoginResponse
    createUser(username: String!, displayName: String, password: String!, passwordConfirmation: String!): User
    
    # updateProfile(displayName: String, bio: String, location: String, website: String): User

    updatePassword(currentPassword: String!, newPassword: String!, newPasswordConfirmation: String!): User
    follow(userId: ID!): User
    unfollow(userId: ID!): User

    # createPost(text: String, gifUrl: String): Post

    deletePost(postId: ID!): Post

    # updatePost(postId: ID!, text: String, gifUrl: String): Post
    
    likePost(postId: ID!): Post
    unlikePost(postId: ID!): Post

    # createRootComment(postId: ID!, text: String, gifUrl: String): Comment
    # createReply(commentId: ID!, text: String, gifUrl: String): Comment

    deleteComment(commentId: ID!): Comment

    # updateComment(commentId: ID!, text: String, gifUrl: String): Comment
    
    likeComment(commentId: ID!): Comment
    unlikeComment(commentId: ID!): Comment
    createPoll(question: String!, choices: [String!]): Post
    voteInPoll(pollId: ID!, choice: Int!): Poll
    repost(id: ID!, contentType: String): Repost
    unrepost(id: ID!): Repost
    findOrCreateRoom(userId: ID!): Room

    # createMessage(roomId: ID!, text: String, gifUrl: String): Message

    deleteMessage(messageId: ID!): Message

    # updateMessage(messageId: ID!, text: String): Message
    }
`;

module.exports = typeDefs;
