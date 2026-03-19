// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IERC721 {
    function transferFrom(address from, address to, uint256 tokenId) external;
    function ownerOf(uint256 tokenId) external view returns (address);
}

contract AnimaAuction {
    struct Auction {
        address seller;
        uint256 minBid;
        uint256 duration;
        uint256 startTime;
        uint256 endTime;
        address highBidder;
        uint256 highBid;
        bool settled;
    }

    mapping(address => mapping(uint256 => Auction)) public auctions;

    event AuctionCreated(address indexed nft, uint256 indexed tokenId, uint256 minBid, uint256 duration);
    event BidPlaced(address indexed nft, uint256 indexed tokenId, address bidder, uint256 amount);
    event AuctionSettled(address indexed nft, uint256 indexed tokenId, address winner, uint256 amount);

    function createAuction(address nft, uint256 tokenId, uint256 minBid, uint256 duration) external {
        require(duration > 0 && duration <= 7 days, "bad duration");
        IERC721(nft).transferFrom(msg.sender, address(this), tokenId);
        auctions[nft][tokenId] = Auction(msg.sender, minBid, duration, 0, 0, address(0), 0, false);
        emit AuctionCreated(nft, tokenId, minBid, duration);
    }

    function bid(address nft, uint256 tokenId) external payable {
        Auction storage a = auctions[nft][tokenId];
        require(a.seller != address(0) && !a.settled, "no auction");
        require(msg.value >= a.minBid, "below min");
        if (a.highBidder != address(0)) {
            require(msg.value > a.highBid, "must exceed current");
            (bool ok,) = a.highBidder.call{value: a.highBid}("");
            require(ok, "refund failed");
        }
        if (a.startTime == 0) {
            a.startTime = block.timestamp;
            a.endTime = block.timestamp + a.duration;
        }
        if (a.endTime - block.timestamp < 300) {
            a.endTime = block.timestamp + 300;
        }
        require(block.timestamp < a.endTime, "auction ended");
        a.highBidder = msg.sender;
        a.highBid = msg.value;
        emit BidPlaced(nft, tokenId, msg.sender, msg.value);
    }

    function settle(address nft, uint256 tokenId) external {
        Auction storage a = auctions[nft][tokenId];
        require(a.seller != address(0) && !a.settled, "no auction");
        require(a.startTime > 0, "no bids");
        require(block.timestamp >= a.endTime, "not ended");
        a.settled = true;
        IERC721(nft).transferFrom(address(this), a.highBidder, tokenId);
        (bool ok,) = a.seller.call{value: a.highBid}("");
        require(ok, "payment failed");
        emit AuctionSettled(nft, tokenId, a.highBidder, a.highBid);
    }

    function cancel(address nft, uint256 tokenId) external {
        Auction storage a = auctions[nft][tokenId];
        require(msg.sender == a.seller, "not seller");
        require(a.startTime == 0, "has bids");
        a.settled = true;
        IERC721(nft).transferFrom(address(this), a.seller, tokenId);
    }
}
