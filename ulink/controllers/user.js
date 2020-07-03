const jwt = require('../modules/jwt');
const encrypt = require('../modules/encryption');
const util = require('../modules/util')
const statusCode = require('../modules/statusCode');
const resMessage = require('../modules/responseMessage');
const userModel = require('../models/user');
const nameMaker = require('../modules/name');

const user = {
    signUp: async (req, res) => {
        const {
            id,
            password,
            name,
            email,
            school
        } = req.body;

        // empty value
        if (!id || !password || !name || !email || !school) {
            return res.status(statusCode.BAD_REQUEST)
                .send(util.fail(statusCode.BAD_REQUEST, resMessage.NULL_VALUE));
        }

        // duplicated id
        if (await userModel.checkUser(id)) {
            return res.status(statusCode.BAD_REQUEST)
                .send(util.fail(statusCode.BAD_REQUEST, resMessage.ALREADY_ID));
        }

        // invalid school
        if (!school.endsWith("학교")) {
            return res.status(statusCode.BAD_REQUEST)
                .send(util.fail(statusCode.BAD_REQUEST, resMessage.INVALID_SCHOOL));
        }

        const salt = encrypt.makeSalt();
        const encryptPassword = encrypt.encryption(password, salt);
        const nickname = nameMaker.makeRandomName();

        const idx = await userModel.signUp(id, encryptPassword, salt, name, email, nickname, school);
        if (idx === -1) {
            return res.status(statusCode.DB_ERROR)
                .send(util.fail(statusCode.DB_ERROR, resMessage.DB_ERROR));
        }

        res.status(statusCode.OK)
            .send(util.success(statusCode.OK, resMessage.CREATED_USER, {
                userId: id,
                userIdx: idx
            }));
    },
    signIn: async (req, res) => {
        const {
            id,
            password
        } = req.body;

        //  empty value
        if (!id || !password) {
            return res.status(statusCode.BAD_REQUEST)
                .send(util.fail(statusCode.BAD_REQUEST, resMessage.NULL_VALUE));
        }

        // check id
        if (!await userModel.checkUser(id)) {
            return res.status(statusCode.BAD_REQUEST)
                .send(util.fail(statusCode.BAD_REQUEST, resMessage.NO_USER));
        }

        const user = await userModel.getUserById(id);
        // check password
        if (user[0].password !== encrypt.encryption(password, user[0].salt)) {
            return res.status(statusCode.BAD_REQUEST)
                .send(util.fail(statusCode.BAD_REQUEST, resMessage.MISS_MATCH_PW));
        }

        const {
            token,
            _
        } = await jwt.sign(user[0]);

        return res.status(statusCode.OK)
            .send(util.success(statusCode.OK, resMessage.LOGIN_SUCCESS, {
                accessToken: token
            }));
    },
    getProfileId: async (req, res) => {
        const id = req.params.id;
        if (!id) {
            return res.status(statusCode.BAD_REQUEST)
                .send(util.fail(statusCode.BAD_REQUEST, resMessage.NULL_VALUE));
        }

        // check id
        if (!await userModel.checkUser(id)) {
            return res.status(statusCode.BAD_REQUEST)
                .send(util.fail(statusCode.BAD_REQUEST, resMessage.NO_USER));
        }

        const user = await userModel.getUserById(id)
        return res.status(statusCode.OK)
            .send(util.success(statusCode.OK, resMessage.READ_PROFILE_SUCCESS, {
                userId: user[0].id,
                name: user[0].name,
                email: user[0].email,
                nickname: user[0].nickname,
                school: user[0].school,
                check: user[0].check,
                profileImage: user[0].profile_image,
                like: user[0].like,
                point: user[0].point,
                level: user[0].level
            }));
    },
    // For debugging
    getProfile: async (req, res) => {
        const userList = await userModel.getUserList()
        return res.status(statusCode.OK)
            .send(util.success(statusCode.OK, resMessage.READ_PROFILE_SUCCESS, {
                userList
            }));
    },
    updateProfile: async (req, res) => {
        const userIdx = req.decoded.userIdx;
        if (req.file === undefined) {
            return res.status(statusCode.BAD_REQUEST)
                .send(util.fail(statusCode.BAD_REQUEST, resMessage.PROFILE_NO_IMAGE));
        }

        const profileImg = req.file.location;
        // data check - undefined
        if (profileImg === undefined || !userIdx) {
            return res.status(statusCode.BAD_REQUEST)
                .send(util.fail(statusCode.BAD_REQUEST, resMessage.PROFILE_NO_IMAGE));
        }
        // check image type
        const type = req.file.mimetype.split('/')[1];
        if (type !== 'jpeg' && type !== 'jpg' && type !== 'png') {
            return res.status(statusCode.BAD_REQUEST)
                .send(util.fail(statusCode.BAD_REQUEST, resMessage.UNSUPPORTED_TYPE));
        }

        const result = await userModel.updateProfile(userIdx, profileImg);
        return res.status(statusCode.OK)
            .send(util.success(statusCode.OK, resMessage.PROFILE_SUCCESS, result));
    }
}

module.exports = user;