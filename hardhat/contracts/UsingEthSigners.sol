// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

// import {UltraVerifier as } from "./withdraw/plonk_vk.sol";

contract UsingEthSingers {
    struct MultisigParams {
        address[] ethSigners;
        uint256 threshold;
    }

    mapping(bytes32 packedPublicKey => address ethSigner) public ethSigner;
    mapping(bytes32 packedPublicKey => MultisigParams signers)
        public multisigEthSigners;
    mapping(bytes32 packedPublicKey => uint256 nonce) public nonce;
    uint256 BJJ_PRIME =
        21888242871839275222246405745257275088548364400416034343698204186575808495617;
    // Verifiers
    // change can be used to revoke, just set to address(0)
    address public addEthSignerVerifier;
    address public changeEthSignerVerifier;
    address public addMultisigEthSignerVerifier;
    address public changeMultisigEthSignerVerifier;

    constructor(
        address _addEthSignerVerifier,
        address _changeEthSignerVerfier,
        address _addMultisigEthSignerVerifier,
        address _changeMultisigEthSignerVerifier
    ) {
        addEthSignerVerifier = _addEthSignerVerifier;
        changeEthSignerVerifier = _changeEthSignerVerfier;
        addMultisigEthSignerVerifier = _addMultisigEthSignerVerifier;
        changeMultisigEthSignerVerifier = _changeMultisigEthSignerVerifier;
    }

    function addEthSigner(
        bytes32 _packedPublicKey,
        address _ethSignerAddress
    ) public {
        require(
            ethSigner[_packedPublicKey] == address(0x0),
            "eth signer already exists"
        );

        bytes32[] memory publicInputs = new bytes32[](2);
        // % p, so it fits in a field element
        // must pass full packed key as private input to circuit and check the hash matches
        publicInputs[0] = bytes32(uint256(_packedPublicKey) % BJJ_PRIME);
        // message hash, signed by eth account
        // it should be unique and not reusable
        publicInputs[1] = keccak256(
            abi.encodePacked(
                address(this),
                _packedPublicKey,
                _ethSignerAddress,
                nonce[_packedPublicKey]
            )
        );

        // The proof checks that the caller has the private key corresponding to the public key
        // addEthSignerVerifier.verify(proof, publicInputs);

        nonce[_packedPublicKey] += 1;
        ethSigner[_packedPublicKey] = _ethSignerAddress;
    }

    function changeEthSigner(
        bytes memory _proof,
        bytes32 _packedPublicKey,
        address _newEthSignerAddress
    ) public {
        require(
            ethSigner[_packedPublicKey] == address(0x0),
            "eth signer must not exist"
        );
        address signer = ethSigner[_packedPublicKey];

        bytes32[] memory publicInputs = new bytes32[](2);
        // recover this address in the circuit
        publicInputs[0] = bytes32(uint256(uint160(signer)));
        // recover with this message hash, it should be unique and not reusable
        publicInputs[1] = keccak256(
            abi.encodePacked(
                address(this),
                _packedPublicKey,
                _newEthSignerAddress,
                nonce[_packedPublicKey]
            )
        );

        // the circuit must check that the caller has the private key corresponding to the public key
        // and that the signature is a valid signature of the messageHash and comes from the current
        // changeEthSignerVerifier.verify(_proof, publicInputs);
        nonce[_packedPublicKey] += 1;
        ethSigner[_packedPublicKey] = _newEthSignerAddress;
    }

    function addMultisigEthSigners(
        bytes memory _proof,
        bytes32 _packedPublicKey,
        address[] memory _ethSignerAddresses,
        uint256 _threshold
    ) public {
        require(
            ethSigner[_packedPublicKey] == address(0x0),
            "eth signer must not exist"
        );
        require(
            multisigEthSigners[_packedPublicKey].ethSigners.length == 0,
            "multisig eth signer must not exist"
        );

        multisigEthSigners[_packedPublicKey] = MultisigParams(
            _ethSignerAddresses,
            _threshold
        );

        // public inputs
        bytes32[] memory publicInputs = new bytes32[](2);
        // private key corresponding to the packed public key controls the account until registered
        publicInputs[0] = bytes32(uint256(_packedPublicKey) % BJJ_PRIME);
        // this should be unique and not reusable
        publicInputs[1] = keccak256(
            abi.encodePacked(
                address(this),
                _packedPublicKey,
                _ethSignerAddresses,
                _threshold,
                nonce[_packedPublicKey]
            )
        );

        // the circuit must check that the caller has the private key corresponding to the public key
        // addMultisigEthSignerVerifier.verify(proof, publicInputs);
        nonce[_packedPublicKey] += 1;
        multisigEthSigners[_packedPublicKey].ethSigners = _ethSignerAddresses;
    }

    function changeMultisigEthSigners(
        bytes memory _proof,
        bytes32 _packedPublicKey,
        address[] memory _newEthSignerAddresses,
        uint256 _threshold
    ) public {
        require(
            multisigEthSigners[_packedPublicKey].ethSigners.length > 0,
            "eth signer must exist"
        );
        // public inputs
        bytes32[] memory publicInputs = new bytes32[](11);
        // hardcoded max of 10 signers, this can be increased
        for (uint8 i; i <= 10; i++) {
            publicInputs[i] = bytes32(
                uint256(
                    uint160(multisigEthSigners[_packedPublicKey].ethSigners[i])
                )
            );
        }
        publicInputs[11] = keccak256(
            abi.encodePacked(
                address(this),
                _packedPublicKey,
                _newEthSignerAddresses,
                _threshold,
                nonce[_packedPublicKey]
            )
        );

        // the circuit must check that signatures (private inputs) are valid signatures of the messageHash
        // and come from the current list of signers and meet the signer threshold
        // changeMultisigEthSignerVerifier.verify(proof, publicInputs);

        nonce[_packedPublicKey] += 1;
        multisigEthSigners[_packedPublicKey]
            .ethSigners = _newEthSignerAddresses;
    }
}
