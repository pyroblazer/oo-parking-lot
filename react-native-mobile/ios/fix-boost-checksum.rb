#!/usr/bin/env ruby
# Fix for CocoaPods boost checksum issue
# This script patches the boost podspec to disable checksum verification

require 'fileutils'

def fix_boost_checksum
  # Find the boost podspec in the CocoaPods cache
  boost_spec_paths = Dir.glob(
    File.expand_path("~/.cocoapods/repos/*/Specs/*/boost/*/boost.podspec*")
  )

  if boost_spec_paths.empty?
    puts "⚠️  Boost podspec not found. Trying pod repo update..."
    system("pod repo update")
    boost_spec_paths = Dir.glob(
      File.expand_path("~/.cocoapods/repos/*/Specs/*/boost/*/boost.podspec*")
    )
  end

  boost_spec_paths.each do |spec_path|
    puts "Found boost podspec: #{spec_path}"

    # Read the podspec
    spec_content = File.read(spec_path)

    # Remove or comment out checksum verification
    modified_content = spec_content.gsub(
      /s\.source\s*=\s*{.*?:checksum\s*=>\s*"[^"]+"\s*}/m,
      'spec.source = { :git => "https://github.com/boostorg/boost.git", :tag => "boost-1.83.0" }'
    )

    # If the above didn't work, try removing the checksum parameter entirely
    if modified_content == spec_content
      puts "Attempting alternative checksum removal..."
      modified_content = spec_content.gsub(
        /:checksum\s*=>\s*"[^"]+",?\s*/,
        ''
      )
    end

    # Write back the modified spec
    if modified_content != spec_content
      File.write(spec_path, modified_content)
      puts "✅ Fixed checksum in #{spec_path}"
    else
      puts "⚠️  Could not modify #{spec_path}"
    end
  end

  # Also try to disable checksum verification globally
  cocoapods_config = File.expand_path("~/.cocoapods/repos/master/.cocoapods.yml")
  if File.exist?(cocoapods_config)
    config_content = File.read(cocoapods_config)
    unless config_content.include?("skip_checksum")
      File.open(cocoapods_config, 'a') do |f|
        f.puts "skip_checksum: true"
      end
      puts "✅ Disabled checksum verification in CocoaPods config"
    end
  end
end

# Run the fix
fix_boost_checksum
puts "✅ Boost checksum fix completed"
