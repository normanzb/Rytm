var chai, spies, should, Rytm, assert, expect;

if (require){
    chai = require('chai');
    spies = require('chai-spies');

    Rytm = require('../Rytm');
}
else{
    chai = this.chai;
    spies = chai_spies;
}

chai.use(spies);

expect = chai.expect;
assert = chai.assert;

var testHelpers = {
    testMultipleTask: function(paramPasser){
        var numberOfTask = 99,
            taskExecutionCount = 0, 
            taskExecutionStatus = {},
            allExecuted = true,
            tasks = [];

        // generate tasks
        for(var l = numberOfTask; l--;){
            tasks.push((function(l){
                var ret = function(){
                    taskExecutionCount++;
                    taskExecutionStatus[l] = true;
                    this.go();
                }

                return ret;
            })(l));
        }

        paramPasser(tasks).go();

        expect(taskExecutionCount).equal(numberOfTask);

        for(var l = numberOfTask; l--;){
            if (taskExecutionStatus[l] !== true){
                allExecuted = false;
                break;
            }
        }

        expect(allExecuted).is.true;
    }
};

describe('Rytm', function(){

    it('should be a constructor', function(){
        expect(Rytm).is.a("function");
    });

    it('should be instantiatable', function(){
        var r = new Rytm();
        expect(r).is.a('object');
        expect(r).is.an.instanceof(Rytm);
    });

    it('accepts tasks as constructor parameters', function(){
        var r = new Rytm();
        var paramPasser = function(tasks){
            var args = [null].concat(tasks);
            return new (Rytm.bind.apply(Rytm, args));
        };

        testHelpers.testMultipleTask(paramPasser);
    });

    describe('.go', function(){
        it('should be able to advance the cursor and execute the following task immediately',
            function(){
                var taskIsExecuted = false, secondTaskExecuted = false;
                var r = new Rytm();
                r
                .beat(function(){
                    taskIsExecuted = true;
                })
                .beat(function(){
                    secondTaskExecuted = true;
                });

                r.go();

                // also imply that the tasks are execute synchronously.
                expect(taskIsExecuted).is.true;
                expect(secondTaskExecuted).is.false;
            }
        );
    });

    describe('.beat', function(){

        it('should return the instance of Rytm (chain-style calling)', function(){
            var r = new Rytm();
            var ret = r.beat(function(){

            });

            expect(ret).equal(r);
        });

        it('should be able to queue a task', function(){
            var taskIsExecuted = false;
            var r = new Rytm();
            r.beat(function(){
                taskIsExecuted = true;
            });

            r.go();

            expect(taskIsExecuted).is.true;
        });

        it('should be able to queue multiple tasks', function(){
            var r = new Rytm();
            var paramPasser = r.beat.apply.bind(r.beat, r);

            testHelpers.testMultipleTask(paramPasser);
        });
    });

    describe('.step', function(){
        it('is a alias of .beat, them should be the same', function(){
            var r = new Rytm();
            expect(r.step).equal(r.beat);
        })
    });

    describe('.defer', function(){
        it('should delay the execution of next task a bit if no parameter given', function(done){
            var isSync = false;
            var r = new Rytm();
            r
            .beat(function(){
                isSync = true;

                this.defer();
            })
            .beat(function(){
                this.go();
            })
            .beat(function(){
                isSync = false;
            })
            .go();

            expect(isSync).is.true;
            setTimeout(function(){
                expect(isSync).is.false;
                done();
            }, 0);
        });

        it('should delay the execution of next task with specified millisecond', function(done){
            var deferExecuted = true;
            var r = new Rytm();
            r
            .beat(function(){
                deferExecuted = false;

                setTimeout(function(){
                    expect(deferExecuted).is.false;
                }, 500);

                this.defer(500);

                setTimeout(function(){
                    expect(deferExecuted).is.true;
                    done();
                }, 500);
            })
            .beat(function(){
                deferExecuted = true;
            })
            .defer(0);

            expect(deferExecuted).is.true;
            setTimeout(function(){
                expect(deferExecuted).is.false;
            }, 0);
        })
    });

    describe('.once', function(){

        it('should execute the coming task immediately if its only "produced" callback gets called', 
            function(done){
                var spy = chai.spy();
                (new Rytm(function(){
                    var callback = this.once();

                    callback();

                    // repeat again to see if any error
                    callback = this.once();

                    callback();

                    setTimeout(function(){

                        expect(spy).have.been.called.once;

                        done();

                    }, 0);

                }, spy)).go();

                // if it is true means the 2nd task is execute sychronously
                expect(spy).have.been.called.once;
            }
        );

        it('should execute the coming task when one of its produced callback gets called.', 
            function(done){
                var spy = chai.spy(), asyncCallCounter = 0;
                (new Rytm(function(){
                    for(var l = 99; l--; ){
                        setTimeout((function(){
                            
                            asyncCallCounter++

                            this();

                            if (asyncCallCounter > 0){
                                expect(spy).have.been.called.once;
                            }

                            if (asyncCallCounter >= 99){
                                done();
                            }
                            
                        }).bind(this.once()), l);
                    }
                }, spy)).go();
            }
        );
    });

    describe('.all', function(){
        it('should execute the coming task when all of its produced callbacks get called.', 
            function(done){
                var spy = chai.spy(), asyncCallCounter = 0;
                (new Rytm(function(){
                    for(var l = 99; l--; ){
                        setTimeout((function(){
                            
                            asyncCallCounter++

                            this();

                            if (asyncCallCounter >= 99){

                                expect(spy).have.been.called.once;

                                done();
                            }
                            else if (asyncCallCounter > 0){
                                expect(spy).have.been.not_called;
                            }
                            
                            
                        }).bind(this.all()), l);
                    }
                }, spy)).go();
            }
        );
    });

});