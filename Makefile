doc:
	groc "*.js" "README.md" --github false

.PHONY: doc

test:
	mocha \
		--reporter landing \
		--ui bdd \
		--require chai \
		--require ./Rytm \
		--growl

.PHONY: test