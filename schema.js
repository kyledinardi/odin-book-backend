const typeDefs = `
  scalar Upload

  type File {
    filename: String!
    mimetype: String!
    encoding: String!
  }

  type UserCounts {
    followers: Int!
    following: Int!
    posts: Int!
    receivedNotifications: Int!
  }

  type PostCounts {
    comments: Int!
  }

  type CommentCounts {
    replies: Int!
  }

  type User {
    id: ID!
    username: String!
    displayName: String!
    pfpUrl: String!
    joinDate: String!
    headerUrl: String
    bio: String
    location: String
    website: String
    passwordHash: String
    provider: String
    providerProfileId: String
    following: [User]
    _count: UserCounts!
  }

  type Post {
    id: ID!
    timestamp: String!
    text: String!
    feedItemType: String!
    imageUrl: String
    user: User!
    userId: Int!
    likes: [User]
    pollChoices: [Choice]
    comments: [Comment]
    reposts: [Repost]
    _count: PostCounts
  }

  type Choice {
    id: ID!
    text: String!
    post: Post!
    postId: Int!
    votes: [User]
  }

  type Comment {
    id: ID!
    timestamp: String!
    text: String!
    feedItemType: String!
    imageUrl: String
    user: User!
    userId: Int!
    post: Post!
    postId: Int!
    parent: Comment
    parentId: Int
    likes: [User]
    replies: [Comment]
    reposts: [Repost]
    notifications: [Notification]
    _count: CommentCounts
    commentChain: [Comment]
  }

  type Repost {
    id: ID!
    timestamp: String!
    feedItemType: String!
    user: User!
    userId: Int!
    post: Post
    postId: Int
    comment: Comment
    commentId: Int
  }

  type Notification {
    id: ID!
    timestamp: String!
    type: String!
    isRead: Boolean
    sourceUser: User!
    sourceUserId: Int!
    targetUser: User!
    targetUserId: Int!
    post: Post
    postId: Int
    comment: Comment
    commentId: Int
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
    userId: Int!
    room: Room!
    roomId: Int
  }

  type LoginResponse {
    user: User!
    token: String!
  }

  union PostOrRepost = Post | Repost

  type Query {
    getListedUsers: [User]
    searchUsers(query: String!, cursor: ID): [User]
    getCurrentUser: User
    getUser(userId: ID!): User
    getFollowing(userId: ID!, cursor: ID): [User]
    getFollowers(userId: ID!, cursor: ID): [User]
    getMutuals(userId: ID!, cursor: ID): [User]
    getFfs(userId: ID!, cursor: ID): [User]

    getIndexPosts(postCursor: ID, repostCursor: ID, timestamp: String): [PostOrRepost]
    searchPosts(query: String!, cursor: ID): [Post]
    getPost(postId: ID!, cursor: ID): Post
    getUserPosts(userId: ID!, postCursor: ID, repostCursor: ID): [PostOrRepost]
    getImagePosts(userId: ID!, cursor: ID): [Post]
    getLikedPosts(userId: ID!, cursor: ID): [Post]

    getComment(commentId: ID!, cursor: ID): Comment
    getUserComments(userId: ID!, cursor: ID): [Comment]
    getPostComments(postId: ID!, commentId: ID): [Comment]
    getReplies(commentId: ID!, replyId: ID): [Comment]

    getAllRooms(cursor: ID): [Room]
    getRoom(roomId: ID!): Room
    getMessages(roomId: ID!, cursor: ID): [Message]
    getNotifications(cursor: ID): [Notification]
    refreshNotifications(timestamp: String!): [Notification]
  }

  type Mutation {
    localLogin(username: String!, password: String!): LoginResponse
    createUser(username: String!, displayName: String, password: String!, passwordConfirmation: String!): LoginResponse
    updateProfile(pfp: Upload, headerImage: Upload, displayName: String, bio: String, location: String, website: String): User
    updatePassword(currentPassword: String!, newPassword: String!, newPasswordConfirmation: String!): User
    follow(userId: ID!): User

    createPost(text: String, gifUrl: String, pollChoices: [String!], image: Upload): Post
    deletePost(postId: ID!): Post
    updatePost(postId: ID!, text: String, gifUrl: String, image: Upload): Post
    likePost(postId: ID!): Post

    voteInPoll(choiceId: ID!): Choice
    repost(id: ID!, contentType: String!): Repost

    createRootComment(postId: ID!, text: String, gifUrl: String, image: Upload): Comment
    createReply(parentId: ID!, text: String, gifUrl: String, image: Upload): Comment
    deleteComment(commentId: ID!): Comment
    updateComment(commentId: ID!, text: String, gifUrl: String, image: Upload): Comment
    likeComment(commentId: ID!): Comment

    findOrCreateRoom(userId: ID!): Room
    createMessage(roomId: ID!, text: String, gifUrl: String): Message
    deleteMessage(messageId: ID!): Message
    updateMessage(messageId: ID!, text: String!): Message
    }
`;

module.exports = typeDefs;
