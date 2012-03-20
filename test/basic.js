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

    it('should be instantiatable', function(){
        var r = new Rytm();
        expect(r).is.a('object');
    });

    it('accepts tasks as constructor parameters', function(){
        var firstCalled = false, secondCalled = false;
        var r = new Rytm(function(){
            firstCalled = true;
            this.go();
        }, function(){
            secondCalled = true;
            this.go();
        })
        .go();
        expect(firstCalled).equal(true);
        expect(secondCalled).equal(true)
    });

    describe('.beat', function(){
        it('should be able to queue a function', function(){
            var r = new Rytm();
            var ret = r.beat(function(){

            });
        });
    });

});