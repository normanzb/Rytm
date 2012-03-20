var chai, should, Rytm;

if (require){
    chai = require('chai');
    Rytm = require('../Rytm');
}
else{
    chai = this.chai;
}

expect = chai.expect;

describe('Rytm', function(){

    it('should be a constructor', function(){
        expect(Rytm).is.a("function");
    });

    describe('beat', function(){
        it('should be able to queue a function', function(){
            var r = new Rytm();
            var ret = r.beat(function(){

            });
        });
    });

});