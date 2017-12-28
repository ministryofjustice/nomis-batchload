module.exports = {NomisClientHolder};

function NomisClientHolder(nomisClientBuilder, signInService, userInfo) {
    let client; // eslint-disable-line no-unused-vars
    this.nomisClientBuilder = nomisClientBuilder;
    this.signInService = signInService;
    this.userInfo = userInfo;
}

NomisClientHolder.prototype.get = async function() {
    if (!this.client) {
        await this.login();
    }
    return this.client;
};

NomisClientHolder.prototype.login = async function() {
    try {
        const user = await this.signInService.signIn(this.userInfo.name, this.userInfo.pass, this.userInfo.roles);
        this.client = this.nomisClientBuilder(user.token);
    } catch (error) {
        throw new Error('Error logging in as user: ' + this.userInfo.name);
    }
};
