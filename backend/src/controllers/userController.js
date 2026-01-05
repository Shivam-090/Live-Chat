import User from "../models/User";
import FriendRequest from "../models/FriendRequest";

export async function getRecommendedUsers (req, res){
    try{
        const currentUserId = req.user.id;
        const currentUser = req.user

        const recommendedUsers = await User.find({
            $and: [
                {_id: {$ne: currentUserId}}, // Exclude current user
                {_id: {$nin: currentUser.friend}}, // Exclude friends
                {isOnboarded: true},
            ]
        })
        res.status(200).json(recommendedUsers);
    }catch (error){
        console.error("Error in getRecommendedUsers Controller:", error.message);
        res.status(500).json({message: "Internal Server Error"});
    }
}

export async function getMyFriends (req, res){
    try{
        const user = await User.findById(req.user.id).select("friends").populate("friends", "fullName, profilePic nativeLanguage learningLanguage");
        res.status(200).json(user.friend);   
    }catch(error){
        console.error("Error in getMyFriends Controller", error.message);
        res.status(500).json({message: "Internal Server Error"});
    }
}

export async function sendFriendRequest (req, res){
    try{
        const myId = req.user.id;
        const {id: recipientId} = req.params;

        // prevent sending request to self
        if(myId === recipientId){
            return res.status(400).json({message: "You cannot send a friend request to yourself"});
        }

        const recipient = await User.findById(recipientId);
        if(!recipient){
            return res.status(404).json({message: "Recipient user not found"});
        }

        // check if already friends
        if(recipient.friend.includes(myId)){
            return res.status(400).json({message: "You are already frineds with this user"});
        }

        // request already exists
        const existingRequest = await FriendRequest.findOne({
            $or: [
                {sender: myId, recipient: recipientId},
                {sender: recipientId, recipient: myId},
            ],
        });
        if(existingRequest){
            return res.status(400).json({message: "A friend request already exists between you and this user"});
        }

        const friendRequest = await FriendRequest.create({
            sender: myId,
            recipient: recipientId,
        },)
        res.status(201).json(friendRequest);

    }catch(error){
        console.error("Error in sendFriendRequest Controller", error.message);
        res.status(500).json({message: "Internal Server Error"});
    }
}

export async function acceptFriendRequest (req, res){
    try{
        const {id: requestId} = req.params;
        const friendRequest = await FriendRequest.findById(requestId);
        if(!friendRequest){
            return res.status(404).json({message: "Friend request not found"});
        }

        // vrify if current user is the recipient
        if(friendRequest.recipient.toString() !== req.user.id){
            return res.status(403).json({message: "You are not authorized to accept this request"});
        }

        friendRequest.status = "accepted";
        await friendRequest.save();

        // update both users' friend lists
        await User.findByIdAndUpdate(friendRequest.sender, {
            $addToSet: {friend: friendRequest.recipient}
        });

        await User.findByIdAndUpdate(friendRequest.recipient, {
            $addToSet: {friend: friendRequest.sender}
        });

        res.status(200).json({message: "Friend request accepted"});

    }catch(error){
        console.error("Error in acceptFriendRequest Controller", error.message);
        res.status(500).json({message: "Internal server error"});
    }
}