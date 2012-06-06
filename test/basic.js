var chai, spies, should, Rytm, assert, expect;

if (require){
    chai = require('chai');
    spies = require('chai-spies');

    Rytm = require('../Rytm');
}
else{
    chai = this.chai;
    spies = this.chai_spies;
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
    },
    compareArgs: function(args1, args2){

        for(var l = args1.length; l--;){

            if (!(l in args1 && l in args2)){
                return false;
            }

            if (args1[l] !== args2[l]){
                return false;
            }
        }

        return true;
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

    describe('.current', function(){
        it('should always return the node of finished task, ' + 
           'while contextual .current() always return the node of current task, ' +
           'and .cursor.value always point to the node of coming task.', function(){

            var spy0 = chai.spy(), spy1 = chai.spy();
            var r = new Rytm();
            r
            .beat(function(){

                expect(this).not.equal(r);

                expect(this.current()).equal(this.steps[1]);

                // test both context.current() and instance.current().
                expect(this.current()).equal(r.current());
                
                this.go();

                expect(this.current()).equal(this.steps[1]);

                expect(r.current()).equal(this.steps[2]);

                this.go();

                expect(this.current()).equal(this.steps[1]);

                expect(r.current()).equal(this.steps[3]);

            }, spy0)
            .beat(spy1);

            expect(r.cursor.value).is.equal(r.steps[0]);

            expect(r.current()).is.equal(null);

            r.go();
        });
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

        it('should be able to pass arguments to next task',
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

        it('should always run coming task (according to cursor position)' + 
            ' no matter how many times go() was called',
            function(){
                var spy0 = chai.spy(), spy1 = chai.spy();
                var r = new Rytm();
                r
                .beat(function(){

                    expect(this.steps[0].went).is.true;

                    expect(this.steps[1].went).is.false;
                    
                    this.go();

                    expect(spy0).have.been.called.once;

                    expect(spy1).have.been.not_called;

                    expect(this.steps[1].went).is.true;

                    expect(this.steps[0].went).is.true;

                    this.go();

                    expect(spy0).have.been.called.once;

                    expect(spy1).have.been.called.once;

                    expect(this.steps[2].went).is.true;

                }, spy0)
                .beat(spy1);

                r.go();
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
            var foobar = {}, 
                args0 = [0, foobar, true, false, undefined], 
                args1 = [1, foobar, true, false, undefined];

            var r = new Rytm();
            r
            .beat(function(){

                expect(arguments).to.satisfy(testHelpers.compareArgs.bind(null, args0));

                this.go.apply(this, args1);

            }, function(){

                expect(arguments).eql(args1);

            })
            // test if the first arg is 0
            .go.apply(r, args0);
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
        });

        it('should be able to pass the arguments to the callback of next task ', function(done){
            var foobar = {}, 
                args0 = [0, foobar, true, false, undefined], 
                args1 = [1, foobar, true, false, undefined],
                args2 = [2, foobar, true, false, undefined];
            var r = new Rytm();
            r
            .beat(function(){

                expect(arguments).to.satisfy(testHelpers.compareArgs.bind(null, args0));

                this.defer(500, args1);

            }, function(){

                expect(arguments).eql(args1);

                // omit the first arg
                this.defer(args2);

            })
            .beat(function(){

                expect(arguments).eql(args2);

                done();

            })
            // test if the first arg is 0
            .defer(0, args0);
        });
    });

    describe('.once', function(){

        it('should execute the coming task immediately if its only "produced" callback gets called', 
            function(done){
                var spy = chai.spy();
                (new Rytm(function(){
                    var callback = this.once(), scope = this;

                    callback();

                    setTimeout(function(){

                        expect(spy).have.been.called.once;

                    }, 0);


                    setTimeout(function(){
                        // repeat again to see if any error
                        callback = scope.once();

                        callback();

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

        it('should be able to pass arguments to next task', function(){
            var foobar = {hello: true}, args = [1, true, foobar];
            var r = new Rytm(function(){
                var c1 = this.once(),
                    c2 = this.once(),
                    c3;

                    c1.apply(null, args);

                    c2(2, true, foobar);

                    c3 = this.once();

                    c3(3, true, foobar);

            }, function(){

                expect(arguments).to.satisfy(testHelpers.compareArgs.bind(null, args));

            }).go();
        });
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

        it('should execute the coming task when all of its produced callbacks get called，' +
            'even when one of its produced callback is called synchronously and immediately. ', 
            function(done){
                var spy = chai.spy(), asyncCallCounter = 1;
                (new Rytm(function(){

                    // execute it immediately
                    this.all()();
                    for(var l = 99; l--; ){
                        setTimeout((function(){
                            
                            asyncCallCounter++

                            this();

                            if (asyncCallCounter >= 100){

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

        it('should pass the arguments that passed into the callbacks,' +
            ' to the coming step in an array. ', 
            function(done){
                var spy = chai.spy(), count = 99;
                (new Rytm(function(){

                    for(var l = count; l--; ){
                        setTimeout((function(l){
                            this(l, l+1);
                            
                        }).bind(this.all(l % 4 ===0?undefined:l), l), Math.floor(Math.random() * 1000));
                    }
                }, function(){
                    for(var i = 0; i < count;i++){
                        var current = count - i - 1;
                        expect(arguments[i][0]).equal(current);
                        expect(arguments[i][1]).equal(current + 1);
                        expect(arguments[i]['key']).equal(current % 4 ===0?undefined:current);
                    }

                    done();
                })).go();
            }
        );
    });

    describe('.wait', function(){
        it('should pause the execution 1 millisecond if no parameter given', function(done){
            var spy = chai.spy();
            var r = new Rytm(function(){
                setTimeout(function(){
                    expect(spy).have.been.called.once;
                    done();
                }, 20);
                this.go()
                expect(spy).have.been.not_called;
            });
            r
            .wait()
            .beat(spy)
            .go();
        });
    });

    describe('.wait', function(){
        it('should pause the execution with specified millisecond', function(){
            var spy = chai.spy();
            var r = new Rytm(function(){
                setTimeout(function(){
                    expect(spy).have.been.not_called;
                }, 20);

                setTimeout(function(){
                    expect(spy).have.been.called.once;
                    done();
                }, 120);
                this.go()
                expect(spy).have.been.not_called;
            });
            r
            .wait(100)
            .beat(spy)
            .go();
        });
    });

    describe('.next', function(){
        it('should be a reference next task.', 
            function(done){
                var spy = chai.spy(), args = [1,true,{}];

                (new Rytm(function(){
                    this.next.apply(this, args);

                    expect(spy).have.been.called.once;

                    done();

                }, function(){
                    expect(arguments).satisfy(testHelpers.compareArgs.bind(null, args));
                    return spy.apply(this, arguments);
                })).go();
            }
        );

        it('should not advance the cursor when called.', 
            function(done){
                var spy = chai.spy(), spy2 = chai.spy();

                (new Rytm(function(){

                    this.next();

                    expect(spy).have.been.called.once;

                    this.next();

                    expect(spy).have.been.called.twice;

                    expect(spy2).have.been.not_called;

                    done();


                }, function(){

                    spy();

                }, function(){

                    spy2();

                })).go();
            }
        );

        it('should advance the cursor to the next task of' +
            'the next task when go() is called in next task.', 
            function(done){
                var spy = chai.spy(), spy2 = chai.spy(), spy3 = chai.spy();

                (new Rytm(function(){

                    this.next();

                    expect(spy).have.been.called.once;

                    expect(spy2).have.been.not_called;

                    this.next();

                    expect(spy).have.been.called.twice;

                    expect(spy2).have.been.called.once;

                    
                    // should point at spy3 (step4)

                    expect(this.current().went).is.true;

                    expect(this.current().next.went).is.true;

                    // because step3 does not call `go()`
                    expect(this.current().next.next.went).is.false;

                    expect(this.cursor.value).equal(this.steps[this.steps.length - 1]);

                    this.next();

                    // futher calling should be ignored
                    expect(spy).have.been.called.twice;

                    expect(spy3).have.been.not_called;

                    expect(this.cursor.value).equal(this.steps[this.steps.length - 1]);

                    done();


                }, function(){

                    spy();

                    if (spy.__spy.calls.length > 1){
                        this.go();
                    }

                }, function(){

                    spy2();

                }, spy3)).go();
            }
        );

        // TODO: test next() with all()
    });

});