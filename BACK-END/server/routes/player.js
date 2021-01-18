
const router = require("express").Router();
var jwt = require('jsonwebtoken');
var ImageUpload=require('../../database/image')
var Player = require('../../database/playerModel');
var Token= require('../../database/token');
var crypto = require('crypto');
var nodemailer = require('nodemailer');
var passport =require ('passport');
//var cloudinaryStorage =require('multer-storage-cloudinary')
const { Error } = require('mongoose');
const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const express = require('express');

// Register
router.post('/Register',  function(req,res,next){
  let newPlayer  = {
    username: req.body.username,
    email: req.body.email,
    password: req.body.password,
  }
  let player= {
    email: req.body.email,
  } ;
  
let token ;
Player.addPlayer(newPlayer)
.then ((player)=>{ 
  
// console.log(player)
// Create a verification token for this player
 token = new Token({ _playerId: player._id, token: crypto.randomBytes(16).toString('hex') });
// Save the verification token
return token.save()
})
.then(()=> {
var transporter = nodemailer.createTransport({ service: 'gmail', auth: {user: 'hellohellio782@gmail.com', pass:"happytogether147"} });
var mailOptions = { from: 'hellohellio782@gmail.com', to: player.email, subject: 'Account Verification Token', text: 'Hello,\n\n' + 'Please verify your account by clicking the link: \nhttp:\/\/' + req.headers.host + '\/players\/confirmation\/' + token.token + '.\n'};
// Send the email
 return transporter.sendMail(mailOptions)
}) 
.then(()=> res.status(200).send({success : true , msg :'A verification email has been sent to ' + player.email + '.'}))
.catch((err) => {
  console.log(err)
  return res.json({success : false , msg :"failed to register player "})
} );
})


/////////////////////////////////////////////////////////////////////// Authentificate
router.post('/Authentificate',  function(req,res,next){
  const username = req.body.username;
  const password = req.body.password;
  let p;
  Player.getUserByUsername(username)
  .then((player)=>{
    if (!player) throw new Error ('player not found');
    p=player;
   return  Player.comparePassword(password, player.password)
  })
  .then((isMatch) =>{
    // console.log(p)
     if (!isMatch) throw new Error ("wrong password")
       const token = jwt.sign({data: p._id},"secretpleasedon'ttoutch");
       return  res.json({
         success: true,
         token:`Bearer ${token}` ,
         player: {
           id: p._id,
           username: p.username,
           email: p.email
         }
       });
    
   })
  .catch((err)=>{
    console .log(err)
    res.json({ success: false, msg: err });})
   
  }) 
  
  ///////////////////////////////////////////////////////////////////////////////////////CONFIRMATION  req.body.token = req.params
  router.get('/confirmation/:token', function(req,res){
    // Find a matching token
    Token.findOne({ token: req.params.token })
    .then((token)=>{
      if (!token) throw new Error ("not verified ")
      return Player.findById(token._playerId).exec();
    })
    .then((player)=>{
      if (!player) throw new Error ('We were unable to find a user for this token.');
      if (player.isVerified) throw new Error ('already-verified');
      // Verify and save the user
      player.isVerified = true;
      return player.save()
    })
    .then(()=>{ return res.json({success : true , msg :"The account has been verified. Please log in."})})
    .catch((err) => {
      // console.log(err.message,typeof(err))
      return res.status(400).json({success : false , msg :err.message})
    })
  });
 
  ///////////////////////////////////////////////////////////////////////////////// LOGIN
  router.post('/login',  function(req,res){
  // Make sure the player has been verified
  if (!Player.isVerified) return res.status(200).send({ success: true, msg: 'Your account has been verified.' })
  // Login successful, write token, and send back user
 return res.status(404).send({ success: false, msg: 'Your account has not been verified.' })
  })
  
//////////////////////////////////////////////////// PROFILE 

router.post('/profile',passport.authenticate('jwt', { session: false }),  (req, res, next) => {
  res.json({player: req.player});
});

cloudinary.config({
  cloud_name : 'dvl9yijld',
  api_key : '482148614276127',
  api_secret : 'U27mtAxCZ10oTWks0tb38gd_gzg'
})

const storage = new CloudinaryStorage({
  cloudinary: cloudinary,

  allowedFormats: ["jpg", "png"],

  filename: function (req, file, cb) {

  cb(undefined, file.fieldname + "-" + Date.now());

  },
});

const parser = multer({ storage: storage });

router.post('/upload', parser.single('Imagefile'),  function(req, res, next) {
  console.log(req.file);
  const image = {};
  image.url = req.file.url;
  image.id = req.file.public_id;
})
;
module.exports = router;
 