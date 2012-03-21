var chai, should, Rytm;

if (require){
    chai = require('chai');
    Rytm = require('../Rytm');
}
else{
    chai = this.chai;
}

expect = chai.expect;

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

        expect(allExecuted).equal(true);
    }
};

describe('Rytm', function(){

    it('should be a constructor', function(){
        expect(Rytm).is.a("function");
    });

    it('should be instantiatable', function(){
        var r = new Rytm();
        expect(r).is.a('object');
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
                expect(taskIsExecuted).equal(true);
                expect(secondTaskExecuted).equal(false);
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

            expect(taskIsExecuted).equal(true);
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

            expect(isSync).equal(true);
            setTimeout(function(){
                expect(isSync).equal(false);
                done();
            }, 0);
        });

        it('should delay the execution of next task with specified millisecond', function(done){
            var deferExecuted = true;
            var r = new Rytm();
            r
            .beat(function(){
                deferExecuted = false;
                this.defer(500);
            })
            .beat(function(){
                deferExecuted = true;
            })
            .defer(0);

            expect(deferExecuted).equal(true);
            setTimeout(function(){
                expect(deferExecuted).equal(false);
            }, 0);
            setTimeout(function(){
                expect(deferExecuted).equal(false);
                done();
            }, 400);
            setTimeout(function(){
                expect(deferExecuted).equal(true);
                done();
            }, 500);
        })
    });

    describe('.once', function(){
        it('should execute the coming task once one of its produced callback gets called.', function(){
            var c1, c2, c3;
            var r = new Rytm(function(){

            }, function(){

            })
        });
    });

});