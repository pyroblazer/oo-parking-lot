#!/usr/bin/env ruby
# frozen_string_literal: true

require 'net/http'
require 'json'
require 'uri'

# Health Check Test Script
# This script tests the health check endpoints of both Go and Ruby APIs

class HealthCheckTester
  attr_reader :results

  def initialize
    @results = []
  end

  def test_health_check(name, url, expected_status = 200)
    puts "\n" + "=" * 60
    puts "Testing #{name}"
    puts "=" * 60
    puts "URL: #{url}"

    begin
      uri = URI.parse(url)
      http = Net::HTTP.new(uri.host, uri.port)
      http.use_ssl = uri.scheme == 'https'
      http.open_timeout = 5
      http.read_timeout = 5

      request = Net::HTTP::Get.new(uri.request_uri)
      request['Accept'] = 'application/json'

      response = http.request(request)

      puts "Status Code: #{response.code}"
      puts "Response Body:"
      puts JSON.pretty_generate(JSON.parse(response.body)) if response.body

      # Validate response
      data = JSON.parse(response.body)
      status_code = response.code.to_i

      # Accept both 200 (ok) and 503 (error) as valid health check responses
      valid_statuses = ['ok', 'error']
      valid_status_codes = [200, 503]

      success = valid_status_codes.include?(status_code) &&
                valid_statuses.include?(data['status']) &&
                data['service'] &&
                data['version'] &&
                data['timestamp'] &&
                data['checks']

      if success
        puts "\n✓ PASSED: Health check returned expected response"
        @results << { name: name, status: 'PASS', url: url }
      else
        puts "\n✗ FAILED: Health check response is invalid"
        @results << { name: name, status: 'FAIL', url: url, reason: 'Invalid response structure' }
      end

    rescue SocketError, Errno::ECONNREFUSED => e
      puts "\n✗ FAILED: Cannot connect to server - #{e.message}"
      @results << { name: name, status: 'FAIL', url: url, reason: "Connection error: #{e.message}" }
    rescue JSON::ParserError => e
      puts "\n✗ FAILED: Invalid JSON response - #{e.message}"
      @results << { name: name, status: 'FAIL', url: url, reason: 'Invalid JSON' }
    rescue StandardError => e
      puts "\n✗ FAILED: #{e.class} - #{e.message}"
      @results << { name: name, status: 'FAIL', url: url, reason: "#{e.class}: #{e.message}" }
    end
  end

  def print_summary
    puts "\n" + "=" * 60
    puts "HEALTH CHECK TEST SUMMARY"
    puts "=" * 60

    passed = @results.count { |r| r[:status] == 'PASS' }
    failed = @results.count { |r| r[:status] == 'FAIL' }
    total = @results.length

    puts "Total Tests: #{total}"
    puts "Passed: #{passed}"
    puts "Failed: #{failed}"

    if failed > 0
      puts "\nFailed Tests:"
      @results.select { |r| r[:status] == 'FAIL' }.each do |result|
        puts "  - #{result[:name]}: #{result[:reason]}"
      end
    end

    puts "\n" + "=" * 60
    exit(failed > 0 ? 1 : 0)
  end
end

# Main execution
if __FILE__ == $PROGRAM_NAME
  puts "Health Check Test Script"
  puts "Testing both Go and Ruby API health endpoints"
  puts "Make sure both servers are running before executing this script."

  tester = HealthCheckTester.new

  # Test Go backend health check
  tester.test_health_check('Go Backend', 'http://localhost:8082/health', 200)

  # Test Ruby backend health check
  tester.test_health_check('Ruby Backend', 'http://localhost:3001/health', 200)

  # Print summary
  tester.print_summary
end
